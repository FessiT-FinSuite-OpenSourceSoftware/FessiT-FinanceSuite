use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use serde_json::json;
use serde::Deserialize;

use crate::{
    models::invoice::{CreateInvoiceRequest, Invoice, InvoiceStatus, UpdateInvoiceRequest},
    services::{ExpenseService, GeneralExpenseService, IncomingInvoiceService, InvoiceService, LedgerService},
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

#[derive(Deserialize)]
struct OrgEmailQuery {
    org_email: String,
}

async fn invoice_belongs_to_user_org(
    service: &web::Data<InvoiceService>,
    invoice: &Invoice,
    org_id: mongodb::bson::oid::ObjectId,
) -> actix_web::Result<bool> {
    if invoice.organisation_id == Some(org_id) {
        return Ok(true);
    }
    let org = service
        .get_organisation_by_id(&org_id.to_string())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(invoice.company_email == org.email)
}

fn parse_amount(input: &str) -> Result<f64, std::num::ParseFloatError> {
    let sanitized: String = input
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_digit() || *ch == '.' || *ch == '-')
        .collect();
    sanitized.parse::<f64>()
}

/// Records a ledger payment entry only when transitioning to Paid.
async fn record_ledger_on_transition(
    ledger_service: &web::Data<LedgerService>,
    invoice: &Invoice,
    previous_status: &InvoiceStatus,
    created_by: Option<&mongodb::bson::oid::ObjectId>,
) {
    if invoice.status != InvoiceStatus::Paid || *previous_status == InvoiceStatus::Paid {
        return;
    }

    let invoice_id = match invoice.id {
        Some(id) => id,
        None => {
            log::error!("Ledger skipped: invoice missing ID ({})", invoice.invoice_number);
            return;
        }
    };
    let org_id = match invoice.organisation_id {
        Some(id) => id,
        None => {
            log::error!("Ledger skipped: invoice {} has no organisation_id", invoice_id);
            return;
        }
    };
    let foreign_amount = match parse_amount(&invoice.total) {
        Ok(v) => v,
        Err(_) => {
            log::error!("Ledger skipped: invoice {} total '{}' is invalid", invoice_id, invoice.total);
            return;
        }
    };

    // For domestic (INR) invoices conversion_rate is 1.0
    // For international invoices use the conversionRate field set at payment time
    let conversion_rate = parse_amount(&invoice.conversion_rate).unwrap_or(1.0).max(0.0);
    let conversion_rate = if conversion_rate == 0.0 { 1.0 } else { conversion_rate };

    log::info!(
        "Recording payment ledger entry for invoice: {} | currency: {} | foreign_amount: {} | rate: {} | inr_equiv: {}",
        invoice_id, invoice.currency_type, foreign_amount, conversion_rate, foreign_amount * conversion_rate
    );

    if let Err(e) = ledger_service
        .record_invoice_payment(
            &invoice_id,
            &invoice.invoice_number,
            invoice.customer_id.as_ref(),
            invoice.billcustomer_name.as_str(),
            foreign_amount,
            invoice.currency_type.as_str(),
            conversion_rate,
            &org_id,
            mongodb::bson::DateTime::now(),
            Some("cleared"),
            Some(invoice.payment_type.as_str()).filter(|s| !s.is_empty()),
            Some(invoice.payment_reference.as_str()).filter(|s| !s.is_empty()),
            created_by,
        )
        .await
    {
        log::error!("Payment ledger entry failed for {}: {}", invoice_id, e);
    }
}

fn merge_invoice_update(existing: &Invoice, mut incoming: Invoice) -> Invoice {
    if incoming.invoice_type.trim().is_empty() { incoming.invoice_type = existing.invoice_type.clone(); }
    if incoming.currency_type.trim().is_empty() { incoming.currency_type = existing.currency_type.clone(); }
    if incoming.company_name.trim().is_empty() { incoming.company_name = existing.company_name.clone(); }
    if incoming.gst_in.trim().is_empty() { incoming.gst_in = existing.gst_in.clone(); }
    if incoming.company_address.trim().is_empty() { incoming.company_address = existing.company_address.clone(); }
    if incoming.company_phone.trim().is_empty() { incoming.company_phone = existing.company_phone.clone(); }
    if incoming.company_email.trim().is_empty() { incoming.company_email = existing.company_email.clone(); }
    if incoming.lut_no.trim().is_empty() { incoming.lut_no = existing.lut_no.clone(); }
    if incoming.iec_no.trim().is_empty() { incoming.iec_no = existing.iec_no.clone(); }
    if incoming.invoice_number.trim().is_empty() { incoming.invoice_number = existing.invoice_number.clone(); }
    if incoming.invoice_date.trim().is_empty() { incoming.invoice_date = existing.invoice_date.clone(); }
    if incoming.invoice_due_date.trim().is_empty() { incoming.invoice_due_date = existing.invoice_due_date.clone(); }
    if incoming.invoice_terms.trim().is_empty() { incoming.invoice_terms = existing.invoice_terms.clone(); }
    if incoming.po_number.trim().is_empty() { incoming.po_number = existing.po_number.clone(); }
    if incoming.po_date.trim().is_empty() { incoming.po_date = existing.po_date.clone(); }
    if incoming.place_of_supply.trim().is_empty() { incoming.place_of_supply = existing.place_of_supply.clone(); }
    if incoming.billcustomer_name.trim().is_empty() { incoming.billcustomer_name = existing.billcustomer_name.clone(); }
    if incoming.billcustomer_address.trim().is_empty() { incoming.billcustomer_address = existing.billcustomer_address.clone(); }
    if incoming.billcustomer_gstin.trim().is_empty() { incoming.billcustomer_gstin = existing.billcustomer_gstin.clone(); }
    if incoming.shipcustomer_name.trim().is_empty() { incoming.shipcustomer_name = existing.shipcustomer_name.clone(); }
    if incoming.shipcustomer_address.trim().is_empty() { incoming.shipcustomer_address = existing.shipcustomer_address.clone(); }
    if incoming.shipcustomer_gstin.trim().is_empty() { incoming.shipcustomer_gstin = existing.shipcustomer_gstin.clone(); }
    if incoming.subject.trim().is_empty() { incoming.subject = existing.subject.clone(); }
    if incoming.items.is_empty() { incoming.items = existing.items.clone(); }
    if incoming.sub_total.trim().is_empty() { incoming.sub_total = existing.sub_total.clone(); }
    if incoming.conversion_rate.trim().is_empty() { incoming.conversion_rate = existing.conversion_rate.clone(); }
    if incoming.approx_conversion_rate.trim().is_empty() { incoming.approx_conversion_rate = existing.approx_conversion_rate.clone(); }
    if incoming.temp_conversion_rate.trim().is_empty() { incoming.temp_conversion_rate = existing.temp_conversion_rate.clone(); }
    if incoming.totalcgst.trim().is_empty() { incoming.totalcgst = existing.totalcgst.clone(); }
    if incoming.totalsgst.trim().is_empty() { incoming.totalsgst = existing.totalsgst.clone(); }
    if incoming.totaligst.trim().is_empty() { incoming.totaligst = existing.totaligst.clone(); }
    if incoming.total.trim().is_empty() { incoming.total = existing.total.clone(); }
    if incoming.notes.trim().is_empty() { incoming.notes = existing.notes.clone(); }
    if incoming.payment_type.trim().is_empty() { incoming.payment_type = existing.payment_type.clone(); }
    if incoming.payment_reference.trim().is_empty() { incoming.payment_reference = existing.payment_reference.clone(); }
    if incoming.customer_id.is_none() { incoming.customer_id = existing.customer_id; }
    if incoming.organisation_id.is_none() { incoming.organisation_id = existing.organisation_id; }
    incoming
}

/// POST /api/v1/invoices
#[post("/invoices")]
pub async fn create_invoice(
    service: web::Data<InvoiceService>,
    ledger_service: web::Data<LedgerService>,
    req: Json<CreateInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let invoice = service.create_invoice(req.into_inner(), &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    // For a brand-new invoice, previous status is New
    record_ledger_on_transition(&ledger_service, &invoice, &InvoiceStatus::New, user.id.as_ref()).await;

    Ok(HttpResponse::Created().json(invoice))
}

/// GET /api/v1/invoices/next-number
#[get("/invoices/next-number")]
pub async fn get_next_invoice_number(
    service: web::Data<InvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let invoice_number = service.peek_next_invoice_number(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(json!({ "invoice_number": invoice_number })))
}

/// GET /api/v1/invoices
#[get("/invoices")]
pub async fn list_invoices(
    service: web::Data<InvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let invoices = if let Some(org_id) = user.organisation_id {
        let org = service.get_organisation_by_id(&org_id.to_string()).await
            .map_err(actix_web::error::ErrorInternalServerError)?;
        service.get_invoices_by_org_or_email(&org_id, &org.email).await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        Vec::new()
    };

    Ok(HttpResponse::Ok().json(invoices))
}

/// GET /api/v1/invoices/{id}
#[get("/invoices/{id}")]
pub async fn get_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let maybe_invoice = service.get_invoice_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(invoice) = maybe_invoice {
        if invoice_belongs_to_user_org(&service, &invoice, org_id).await? {
            return Ok(HttpResponse::Ok().json(invoice));
        }
    }

    Ok(HttpResponse::NotFound().json(json!({ "message": "Invoice not found" })))
}

/// PUT /api/v1/invoices/{id}
#[put("/invoices/{id}")]
pub async fn update_invoice(
    service: web::Data<InvoiceService>,
    ledger_service: web::Data<LedgerService>,
    id: Path<String>,
    req: Json<UpdateInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let existing = service.get_invoice_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Invoice not found" })))?;

    if !invoice_belongs_to_user_org(&service, &existing, org_id).await? {
        return Ok(HttpResponse::NotFound().json(json!({ "message": "Invoice not found" })));
    }

    if existing.status == InvoiceStatus::Paid && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Only admins can modify a Paid invoice" })));
    }

    let previous_status = existing.status.clone();
    let merged = merge_invoice_update(&existing, req.into_inner());

    let maybe_updated = service.update_invoice(&id, merged).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(updated) = maybe_updated {
        // Only record ledger entry if status actually changed
        if updated.status != previous_status {
            record_ledger_on_transition(&ledger_service, &updated, &previous_status, user.id.as_ref()).await;
        }
        Ok(HttpResponse::Ok().json(updated))
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Invoice not found" })))
    }
}

/// DELETE /api/v1/invoices/{id}
#[delete("/invoices/{id}")]
pub async fn delete_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let existing = service.get_invoice_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Invoice not found" })))?;

    if !invoice_belongs_to_user_org(&service, &existing, org_id).await? {
        return Ok(HttpResponse::NotFound().json(json!({ "message": "Invoice not found" })));
    }

    let deleted = service.delete_invoice(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Invoice not found" })))
    }
}

/// GET /api/v1/invoices/customer/{customer_id}
#[get("/invoices/customer/{customer_id}")]
pub async fn list_invoices_by_customer(
    service: web::Data<InvoiceService>,
    customer_id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let cid = mongodb::bson::oid::ObjectId::parse_str(&customer_id.into_inner())
        .map_err(|_| actix_web::error::ErrorBadRequest("Invalid customer ID"))?;

    let invoices = service.get_invoices_by_customer(&cid).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(invoices))
}

/// GET /api/v1/invoices/gst-summary
#[get("/invoices/gst-summary")]
pub async fn get_gst_summary(
    service: web::Data<InvoiceService>,
    incoming_service: web::Data<IncomingInvoiceService>,
    expense_service: web::Data<ExpenseService>,
    general_expense_service: web::Data<GeneralExpenseService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let summary = service.get_monthly_gst_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let incoming_summary = incoming_service.get_monthly_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let expense_summary = expense_service.get_monthly_gst_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let general_expense_summary = general_expense_service.get_monthly_gst_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let expense_count = expense_summary.expense_count + general_expense_summary.expense_count + incoming_summary.invoice_count;
    let total_amount = expense_summary.total_amount + general_expense_summary.total_amount + incoming_summary.total_amount;
    let total_tax = expense_summary.total_tax + general_expense_summary.total_tax + incoming_summary.total_gst_collected;
    let total_cgst = expense_summary.total_cgst + general_expense_summary.total_cgst + incoming_summary.total_cgst;
    let total_sgst = expense_summary.total_sgst + general_expense_summary.total_sgst + incoming_summary.total_sgst;
    let total_igst = expense_summary.total_igst + general_expense_summary.total_igst + incoming_summary.total_igst;
    let total_gst_collected = expense_summary.total_gst_collected + general_expense_summary.total_gst_collected + incoming_summary.total_gst_collected;
    let net_gst_payable = summary.total_gst_collected - total_gst_collected;

    Ok(HttpResponse::Ok().json(json!({
        "month": summary.month,
        "outgoing_invoice_details": {
            "invoice_count": summary.invoice_count,
            "total_cgst": summary.total_cgst,
            "total_sgst": summary.total_sgst,
            "total_igst": summary.total_igst,
            "total_gst_collected": summary.total_gst_collected,
            "paid_amount": summary.paid_amount,
            "paid_invoice_count": summary.paid_invoice_count,
            "breakdown": summary.breakdown
        },
        "outgoing_invoices": {
            "invoice_count": summary.invoice_count,
            "total_cgst": summary.total_cgst,
            "total_sgst": summary.total_sgst,
            "total_igst": summary.total_igst,
            "total_gst_collected": summary.total_gst_collected,
            "paid_amount": summary.paid_amount,
            "paid_invoice_count": summary.paid_invoice_count
        },
        "incoming_invoices": {
            "invoice_count": incoming_summary.invoice_count,
            "total_amount": incoming_summary.total_amount,
            "total_cgst": incoming_summary.total_cgst,
            "total_sgst": incoming_summary.total_sgst,
            "total_igst": incoming_summary.total_igst,
            "total_gst_collected": incoming_summary.total_gst_collected,
            "paid_amount": incoming_summary.paid_amount,
            "paid_invoice_count": incoming_summary.paid_invoice_count
        },
        "expenses": {
            "expense_count": expense_summary.expense_count,
            "total_amount": expense_summary.total_amount,
            "total_cgst": expense_summary.total_cgst,
            "total_sgst": expense_summary.total_sgst,
            "total_igst": expense_summary.total_igst,
            "total_gst_collected": expense_summary.total_gst_collected
        },
        "general_expenses": {
            "expense_count": general_expense_summary.expense_count,
            "total_amount": general_expense_summary.total_amount,
            "total_cgst": general_expense_summary.total_cgst,
            "total_sgst": general_expense_summary.total_sgst,
            "total_igst": general_expense_summary.total_igst,
            "total_gst_collected": general_expense_summary.total_gst_collected
        },
        "combined_expense_gst": {
            "expense_count": expense_count,
            "total_amount": total_amount,
            "total_tax": total_tax,
            "total_cgst": total_cgst,
            "total_sgst": total_sgst,
            "total_igst": total_igst,
            "total_gst_collected": total_gst_collected
        },
        "net_gst_payable": {
            "outgoing_gst_collected": summary.total_gst_collected,
            "incoming_gst_collected": incoming_summary.total_gst_collected,
            "expense_gst_collected": total_gst_collected,
            "net_payable": net_gst_payable
        }
    })))
}

/// Register invoice routes under /api/v1
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_next_invoice_number)
        .service(get_gst_summary)
        .service(list_invoices_by_customer)
        .service(create_invoice)
        .service(list_invoices)
        .service(get_invoice)
        .service(update_invoice)
        .service(delete_invoice);
}
