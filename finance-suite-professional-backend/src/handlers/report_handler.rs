use actix_web::{get, web, HttpResponse, Responder, HttpRequest, HttpMessage};
use serde::Deserialize;
use serde_json::json;

use crate::{
    services::{InvoiceService, IncomingInvoiceService, ExpenseService, GeneralExpenseService, SalaryService},
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

/// Query: ?fy=2025  (Indian FY start year, e.g. 2025 = Apr 2025 – Mar 2026)
/// OR custom range: ?from_year=2025&from_month=04&to_year=2026&to_month=03
#[derive(Deserialize)]
struct PnlQuery {
    fy:         Option<u32>,
    from_year:  Option<u32>,
    from_month: Option<u32>,
    to_year:    Option<u32>,
    to_month:   Option<u32>,
}

fn in_range(date: &str, from: &str, to: &str) -> bool {
    let d = date.trim();
    if d.len() < 7 { return false; }
    let ym = &d[0..7];
    ym >= from && ym <= to
}

fn extract_ym(date: &str) -> Option<String> {
    let d = date.trim();
    if d.len() >= 7 && d.chars().nth(4) == Some('-') {
        return Some(d[0..7].to_string());
    }
    if d.len() >= 10 && d.chars().nth(2) == Some('-') {
        return Some(format!("{}-{}", &d[6..10], &d[3..5]));
    }
    None
}

fn current_fy_start() -> u32 {
    use chrono::Datelike;
    let now = chrono::Utc::now();
    let m = now.month();
    let y = now.year() as u32;
    if m >= 4 { y } else { y - 1 }
}

/// GET /api/v1/reports/profit-loss
#[get("/reports/profit-loss")]
pub async fn get_profit_loss(
    invoice_service:          web::Data<InvoiceService>,
    incoming_invoice_service: web::Data<IncomingInvoiceService>,
    expense_service:          web::Data<ExpenseService>,
    general_expense_service:  web::Data<GeneralExpenseService>,
    salary_service:           web::Data<SalaryService>,
    query:                    web::Query<PnlQuery>,
    http_req:                 HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = invoice_service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    // ── Resolve date range ────────────────────────────────────────────────────
    let (from, to, fy_start) = if let Some(fy) = query.fy {
        (format!("{}-04", fy), format!("{}-03", fy + 1), fy)
    } else if let (Some(fy), Some(fm), Some(ty), Some(tm)) =
        (query.from_year, query.from_month, query.to_year, query.to_month)
    {
        let f = format!("{}-{:02}", fy, fm);
        let t = format!("{}-{:02}", ty, tm);
        let fys = if fm >= 4 { fy } else { fy - 1 };
        (f, t, fys)
    } else {
        let fys = current_fy_start();
        (format!("{}-04", fys), format!("{}-03", fys + 1), fys)
    };

    use chrono::Datelike;
    let generated_at = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // ── Organisation details ──────────────────────────────────────────────────
    let org = invoice_service.get_organisation_by_id(&org_id.to_string()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    // ═════════════════════════════════════════════════════════════════════════
    // REVENUE
    // Source : Outgoing invoices
    // Rule   : Status must be Paid
    // Date   : invoice_date within period
    // Amount : invoice.total (INR). International → total × conversion_rate
    // ═════════════════════════════════════════════════════════════════════════
    let invoices = invoice_service.get_invoices_by_org_or_email(&org_id, &org.email).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut revenue_total = 0.0f64;
    let mut revenue_items: Vec<serde_json::Value> = Vec::new();

    for inv in &invoices {
        if inv.status != crate::models::invoice::InvoiceStatus::Paid { continue; }
        let date_ym = match extract_ym(&inv.invoice_date) { Some(v) => v, None => continue };
        if !in_range(&date_ym, &from, &to) { continue; }

        let is_intl = inv.invoice_type.trim().to_lowercase() == "international";
        let raw     = inv.total.parse::<f64>().unwrap_or(0.0);
        let rate    = if is_intl {
            let cr = inv.conversion_rate.parse::<f64>().unwrap_or(0.0);
            if cr > 0.0 { cr } else { 1.0 }
        } else { 1.0 };
        let inr = raw * rate;
        revenue_total += inr;

        revenue_items.push(json!({
            "date":           inv.invoice_date,
            "ref":            inv.invoice_number,
            "party":          inv.billcustomer_name,
            "type":           if is_intl { "International" } else { "Domestic" },
            "currency":       inv.currency_type,
            "amount_foreign": raw,
            "fx_rate":        rate,
            "amount_inr":     inr
        }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPENSE 1 — Incoming Invoices (Vendor Bills)
    // Source : Incoming invoices
    // Rule   : Status must be Paid
    // Date   : invoice_date within period
    // Amount : invoice.total (as recorded, INR)
    // ═════════════════════════════════════════════════════════════════════════
    let incoming = incoming_invoice_service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut incoming_total = 0.0f64;
    let mut incoming_items: Vec<serde_json::Value> = Vec::new();

    for inv in &incoming {
        if inv.status.trim().to_lowercase() != "paid" { continue; }
        let date_ym = match extract_ym(&inv.invoice_date) { Some(v) => v, None => continue };
        if !in_range(&date_ym, &from, &to) { continue; }

        let amount = inv.total.parse::<f64>().unwrap_or(0.0);
        incoming_total += amount;
        incoming_items.push(json!({
            "date":    inv.invoice_date,
            "ref":     inv.invoice_number,
            "vendor":  inv.vendor_name,
            "amount":  amount
        }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPENSE 2 — Employee Expenses
    // Source : Expense reports → individual items
    // Rule   : Expense report status must be Reimbursed
    // Date   : item.expense_date within period
    // Amount : item.sub_total (base amount + GST)
    // ═════════════════════════════════════════════════════════════════════════
    let expenses = expense_service.get_expenses_by_organisation(&org_id, None, None).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut emp_total = 0.0f64;
    let mut emp_items: Vec<serde_json::Value> = Vec::new();

    for exp in &expenses {
        if exp.status != crate::models::expense::ExpenseStatus::Reimbursed { continue; }
        for item in &exp.items {
            let date_ym = match extract_ym(&item.expense_date) { Some(v) => v, None => continue };
            if !in_range(&date_ym, &from, &to) { continue; }
            emp_total += item.sub_total;
            emp_items.push(json!({
                "date":     item.expense_date,
                "title":    exp.expense_title,
                "category": item.expense_category,
                "vendor":   item.vendor,
                "amount":   item.sub_total
            }));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPENSE 3 — General Expenses
    // Source : General expenses
    // Rule   : Status must be Approved
    // Date   : expense.date within period
    // Amount : expense.sub_total (base amount + GST)
    // ═════════════════════════════════════════════════════════════════════════
    let gen_expenses = general_expense_service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut gen_total = 0.0f64;
    let mut gen_items: Vec<serde_json::Value> = Vec::new();

    for exp in &gen_expenses {
        if exp.status != crate::models::general_expense::GeneralExpenseStatus::Approved { continue; }
        let date_ym = match extract_ym(&exp.date) { Some(v) => v, None => continue };
        if !in_range(&date_ym, &from, &to) { continue; }
        gen_total += exp.sub_total;
        gen_items.push(json!({
            "date":     exp.date,
            "title":    exp.title,
            "category": exp.category,
            "amount":   exp.sub_total
        }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPENSE 4 — Salaries / Payroll
    // Source : Salary records
    // Rule   : Status must be Paid
    // Date   : salary.period (YYYY-MM) within range
    // Amount : gross_salary (full cost to company before TDS)
    // ═════════════════════════════════════════════════════════════════════════
    let salaries = salary_service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut salary_gross = 0.0f64;
    let mut salary_tds   = 0.0f64;
    let mut salary_net   = 0.0f64;
    let mut salary_items: Vec<serde_json::Value> = Vec::new();

    for sal in &salaries {
        if sal.status != crate::models::salary::SalaryStatus::Paid { continue; }
        let date_ym = match extract_ym(&sal.period) { Some(v) => v, None => continue };
        if !in_range(&date_ym, &from, &to) { continue; }

        let g = sal.gross_salary.parse::<f64>().unwrap_or(0.0);
        let t = sal.tds.parse::<f64>().unwrap_or(0.0);
        let n = sal.net_salary.parse::<f64>().unwrap_or(0.0);
        salary_gross += g;
        salary_tds   += t;
        salary_net   += n;
        salary_items.push(json!({
            "period":       sal.period,
            "emp_name":     sal.emp_name,
            "emp_id":       sal.emp_id,
            "department":   sal.department,
            "gross_salary": g,
            "tds":          t,
            "net_salary":   n
        }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SUMMARY CALCULATIONS
    //
    //  Total Expenses = Incoming Invoices
    //                 + Employee Expenses
    //                 + General Expenses
    //                 + Payroll (gross)
    //
    //  Net Profit     = Revenue − Total Expenses
    //  Net Margin %   = Net Profit / Revenue × 100
    // ═════════════════════════════════════════════════════════════════════════
    let total_expenses = incoming_total + emp_total + gen_total + salary_gross;
    let net_profit     = revenue_total - total_expenses;
    let net_margin     = if revenue_total > 0.0 {
        (net_profit / revenue_total * 10000.0).round() / 10000.0
    } else { 0.0 };

    Ok(HttpResponse::Ok().json(json!({
        "meta": {
            "company": {
                "name":     org.company_name,
                "gstin":    org.gst_in,
                "email":    org.email,
                "phone":    org.phone,
                "country":  org.country,
                "currency": if org.currency.is_empty() { "INR" } else { &org.currency }
            },
            "report": {
                "type":         "P&L",
                "fy":           format!("FY {}-{}", fy_start, (fy_start + 1) % 100),
                "period":       { "from": from, "to": to },
                "currency":     "INR",
                "basis":        "Accrual",
                "generated_at": generated_at,
                "status":       "Draft"
            }
        },

        // ── Top-level KPIs ──────────────────────────────────────────────────
        "summary": {
            "revenue":        revenue_total,
            "total_expenses": total_expenses,
            "net_profit":     net_profit,
            "net_margin_pct": net_margin
        },

        // ── Revenue breakdown ───────────────────────────────────────────────
        "revenue": {
            "description": "Paid outgoing invoices. International amounts converted to INR.",
            "total":       revenue_total,
            "count":       revenue_items.len(),
            "items":       revenue_items
        },

        // ── Expenses breakdown (4 sources) ──────────────────────────────────
        "expenses": {
            "total": total_expenses,

            "incoming_invoices": {
                "description": "Paid vendor/supplier bills (incoming invoices).",
                "total":       incoming_total,
                "count":       incoming_items.len(),
                "items":       incoming_items
            },

            "employee_expenses": {
                "description": "Reimbursed employee expense items.",
                "total":       emp_total,
                "count":       emp_items.len(),
                "items":       emp_items
            },

            "general_expenses": {
                "description": "Approved general/overhead expenses.",
                "total":       gen_total,
                "count":       gen_items.len(),
                "items":       gen_items
            },

            "payroll": {
                "description":  "Paid salaries — gross salary is the cost to company.",
                "gross_total":  salary_gross,
                "tds_total":    salary_tds,
                "net_total":    salary_net,
                "count":        salary_items.len(),
                "items":        salary_items
            }
        },

        // ── Notes ───────────────────────────────────────────────────────────
        "notes": [
            {
                "title": "Revenue",
                "rule":  "Outgoing invoices with status = Paid",
                "date":  "invoice_date"
            },
            {
                "title": "Incoming Invoices",
                "rule":  "Incoming invoices with status = Paid",
                "date":  "invoice_date"
            },
            {
                "title": "Employee Expenses",
                "rule":  "Expense reports with status = Reimbursed",
                "date":  "expense_date (per item)"
            },
            {
                "title": "General Expenses",
                "rule":  "General expenses with status = Approved",
                "date":  "date"
            },
            {
                "title": "Payroll",
                "rule":  "Salary records with status = Paid. Amount = gross_salary.",
                "date":  "period (YYYY-MM)"
            }
        ]
    })))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_profit_loss);
}
