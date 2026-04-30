use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use chrono::{DateTime as ChronoDateTime, NaiveDate};
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use printpdf::*;

use crate::{
    models::ledger::LedgerEntry,
    services::ledger_service::LedgerService,
    services::organisation_service::OrganisationService,
    repository::customer_repository::CustomerRepository,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

#[derive(Debug, Deserialize, Default)]
pub struct LedgerQuery {
    pub party_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
struct LedgerResponse {
    data: Vec<crate::models::ledger::LedgerEntry>,
    total: u64,
    total_amount: f64,
    page: Option<u64>,
    limit: Option<i64>,
}

/// GET /api/v1/ledger
/// Query params: from (ISO date), to (ISO date), page, limit
#[get("/ledger")]
pub async fn get_ledger(
    service: web::Data<LedgerService>,
    query: web::Query<LedgerQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let q = query.into_inner();
    let page = q.page;
    let limit = q.limit;
    let party_id = match q.party_id {
        Some(value) => Some(ObjectId::parse_str(&value)
            .map_err(|_| actix_web::error::ErrorBadRequest("Invalid party ID"))?),
        None => None,
    };

    let result = service.query(&org_id, party_id, q.from, q.to, page, limit).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    println!("✌️ Sending response: total={}", result.total_amount);
    Ok(HttpResponse::Ok().json(LedgerResponse {
        data: result.data,
        total: result.total,
        total_amount: result.total_amount,
        page,
        limit,
    }))
}

fn format_paise(paise: i64) -> String {
    format!("{:.2}", paise as f64 / 100.0)
}

struct PartyInfo {
    name: String,
    email: String,
    phone: String,
    address: String,
    gstin: String,
}

fn draw_line(layer: &PdfLayerReference, x1: f32, x2: f32, y: f32) {
    let line = Line {
        points: vec![
            (Point::new(Mm(x1), Mm(y)), false),
            (Point::new(Mm(x2), Mm(y)), false),
        ],
        is_closed: false,
    };
    layer.add_line(line);
}

fn parse_display_date(input: &str) -> Option<String> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return None;
    }

    if let Ok(date_time) = ChronoDateTime::parse_from_rfc3339(trimmed) {
        return Some(date_time.date_naive().format("%d %b %Y").to_string());
    }

    NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
        .ok()
        .map(|date| date.format("%d %b %Y").to_string())
}

fn format_period(from: &str, to: &str) -> String {
    let from_display = parse_display_date(from).unwrap_or_else(|| from.trim().to_string());
    let to_display = parse_display_date(to).unwrap_or_else(|| to.trim().to_string());

    match (from_display.is_empty(), to_display.is_empty()) {
        (true, true) => "All Dates".to_string(),
        (false, true) => format!("From {}", from_display),
        (true, false) => format!("Up to {}", to_display),
        (false, false) => format!("{} to {}", from_display, to_display),
    }
}

fn set_text_color(layer: &PdfLayerReference, r: f32, g: f32, b: f32) {
    layer.set_fill_color(Color::Rgb(Rgb::new(r, g, b, None)));
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let cleaned = text.trim();
    if cleaned.is_empty() {
        return vec!["-".to_string()];
    }

    let mut lines = Vec::new();
    let mut current = String::new();

    for word in cleaned.split_whitespace() {
        let word_len = word.chars().count();

        if word_len > max_chars {
            if !current.is_empty() {
                lines.push(current.trim().to_string());
                current.clear();
            }

            let mut chunk = String::new();
            for ch in word.chars() {
                chunk.push(ch);
                if chunk.chars().count() >= max_chars {
                    lines.push(chunk.clone());
                    chunk.clear();
                }
            }

            if !chunk.is_empty() {
                current = chunk;
            }
            continue;
        }

        let prospective_len = if current.is_empty() {
            word_len
        } else {
            current.chars().count() + 1 + word_len
        };

        if prospective_len > max_chars && !current.is_empty() {
            lines.push(current.trim().to_string());
            current.clear();
        }

        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }

    if !current.is_empty() {
        lines.push(current.trim().to_string());
    }

    if lines.is_empty() {
        lines.push("-".to_string());
    }

    lines
}

fn start_ledger_page(
    doc: &PdfDocumentReference,
    page_title: &str,
) -> PdfLayerReference {
    let (page_idx, layer_idx) = doc.add_page(Mm(210.0), Mm(297.0), page_title);
    doc.get_page(page_idx).get_layer(layer_idx)
}

fn render_ledger_header(
    layer: &PdfLayerReference,
    font_bold: &IndirectFontRef,
    font: &IndirectFontRef,
    org_name: &str,
    org_email: &str,
    org_phone: &str,
    org_address: &str,
    org_gstin: &str,
    from: &str,
    to: &str,
    party: Option<&PartyInfo>,
) -> f32 {
    let mut y = 282.0f32;

    // Row 1: Org name alone
    set_text_color(layer, 0.12, 0.18, 0.32);
    layer.use_text(org_name, 14.0, Mm(15.0), Mm(y), font_bold);
    y -= 6.0;

    // Row 2: Email (left) | Period (right) — same y
    set_text_color(layer, 0.35, 0.40, 0.48);
    if !org_email.is_empty() {
        layer.use_text(&format!("Email: {}", org_email), 8.0, Mm(15.0), Mm(y), font);
    }
    set_text_color(layer, 0.18, 0.52, 0.78);
    layer.use_text(&format!("Period: {}", format_period(from, to)), 9.0, Mm(130.0), Mm(y), font_bold);
    y -= 4.5;

    // Row 3: Phone (left)
    set_text_color(layer, 0.35, 0.40, 0.48);
    if !org_phone.is_empty() {
        layer.use_text(&format!("Ph: {}", org_phone), 8.0, Mm(15.0), Mm(y), font);
    }
    y -= 4.5;

    // Row 4: Address (left) | GSTIN (right) — same y
    if !org_address.is_empty() {
        layer.use_text(&format!("Address: {}", &org_address.chars().take(55).collect::<String>()), 8.0, Mm(15.0), Mm(y), font);
    }
    if !org_gstin.is_empty() {
        layer.use_text(&format!("GSTIN: {}", org_gstin), 8.0, Mm(130.0), Mm(y), font);
    }
    y -= 5.0;

    // Separator
    set_text_color(layer, 0.72, 0.74, 0.78);
    draw_line(layer, 15.0, 200.0, y);
    y -= 4.5;

    // Document title
    set_text_color(layer, 0.12, 0.18, 0.32);
    layer.use_text("LEDGER STATEMENT", 10.0, Mm(15.0), Mm(y), font_bold);
    y -= 4.5;

    // Party details block (only when filtered by party)
    if let Some(p) = party {
        set_text_color(layer, 0.72, 0.74, 0.78);
        draw_line(layer, 15.0, 200.0, y);
        y -= 5.0;

        set_text_color(layer, 0.12, 0.18, 0.32);
        layer.use_text(&p.name, 10.0, Mm(15.0), Mm(y), font_bold);
        y -= 5.0;

        set_text_color(layer, 0.35, 0.40, 0.48);
        if !p.email.is_empty() {
            layer.use_text(&format!("Email: {}", p.email), 8.0, Mm(15.0), Mm(y), font);
        }
        if !p.phone.is_empty() {
            layer.use_text(&format!("Ph: {}", p.phone), 8.0, Mm(130.0), Mm(y), font);
        }
        y -= 4.5;

        if !p.address.is_empty() {
            layer.use_text(&format!("Address: {}", &p.address.chars().take(55).collect::<String>()), 8.0, Mm(15.0), Mm(y), font);
        }
        if !p.gstin.is_empty() {
            layer.use_text(&format!("GSTIN: {}", p.gstin), 8.0, Mm(130.0), Mm(y), font);
        }
        y -= 5.0;
    }

    // Second separator
    set_text_color(layer, 0.72, 0.74, 0.78);
    draw_line(layer, 15.0, 200.0, y);
    y -= 6.0;

    // Column headers
    set_text_color(layer, 0.10, 0.10, 0.10);
    layer.use_text("Date",        8.5, Mm(15.0),  Mm(y), font_bold);
    layer.use_text("Particulars", 8.5, Mm(35.0),  Mm(y), font_bold);
    layer.use_text("Vch No",      8.5, Mm(105.0), Mm(y), font_bold);
    set_text_color(layer, 0.18, 0.52, 0.78);
    layer.use_text("Debit",       8.5, Mm(135.0), Mm(y), font_bold);
    set_text_color(layer, 0.82, 0.28, 0.25);
    layer.use_text("Credit",      8.5, Mm(158.0), Mm(y), font_bold);
    set_text_color(layer, 0.10, 0.10, 0.10);
    layer.use_text("Balance",     8.5, Mm(178.0), Mm(y), font_bold);

    y -= 4.0;
    set_text_color(layer, 0.72, 0.74, 0.78);
    draw_line(layer, 15.0, 200.0, y);
    y -= 6.0;

    y
}

fn ensure_page_space(
    doc: &PdfDocumentReference,
    layer: &mut PdfLayerReference,
    y: &mut f32,
    min_space: f32,
    font_bold: &IndirectFontRef,
    font: &IndirectFontRef,
    org_name: &str,
    org_email: &str,
    org_phone: &str,
    org_address: &str,
    org_gstin: &str,
    from: &str,
    to: &str,
    party: Option<&PartyInfo>,
) {
    if *y >= 20.0 + min_space {
        return;
    }
    *layer = start_ledger_page(doc, "Ledger Statement");
    *y = render_ledger_header(
        layer, font_bold, font,
        org_name, org_email, org_phone, org_address, org_gstin,
        from, to, party,
    );
}

fn render_ledger_table_row(
    layer: &PdfLayerReference,
    font: &IndirectFontRef,
    date: &str,
    description: &str,
    reference: &str,
    debit: &str,
    credit: &str,
    balance: i64,
    y: f32,
) {
    let desc_lines = wrap_text(description, 40);
    let line_step = 4.5f32;

    set_text_color(layer, 0.12, 0.12, 0.12);
    layer.use_text(date,      8.0, Mm(15.0),  Mm(y), font);
    for (idx, line) in desc_lines.iter().enumerate() {
        let line_y = y - (idx as f32 * line_step);
        layer.use_text(line, 8.0, Mm(35.0), Mm(line_y), font);
    }
    layer.use_text(reference, 8.0, Mm(105.0), Mm(y), font);
    set_text_color(layer, 0.18, 0.52, 0.78);
    layer.use_text(debit,     8.0, Mm(135.0), Mm(y), font);
    set_text_color(layer, 0.82, 0.28, 0.25);
    layer.use_text(credit,    8.0, Mm(158.0), Mm(y), font);

    // Balance column — negative shown as -amount in red, positive in dark
    let (bal_str, is_neg) = if balance < 0 {
        (format!("-{}", format_paise(-balance)), true)
    } else {
        (format_paise(balance), false)
    };
    if is_neg {
        set_text_color(layer, 0.82, 0.28, 0.25);
    } else {
        set_text_color(layer, 0.10, 0.10, 0.10);
    }
    layer.use_text(bal_str, 8.0, Mm(178.0), Mm(y), font);
}

fn generate_ledger_pdf(
    entries: &[LedgerEntry],
    org_name: &str,
    org_email: &str,
    org_phone: &str,
    org_address: &str,
    org_gstin: &str,
    from: &str,
    to: &str,
    party: Option<&PartyInfo>,
) -> Vec<u8> {
    let (doc, page1, layer1) =
        PdfDocument::new("Ledger Statement", Mm(210.0), Mm(297.0), "Layer 1");

    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let mut layer = doc.get_page(page1).get_layer(layer1);
    let mut y = render_ledger_header(
        &layer, &font_bold, &font,
        org_name, org_email, org_phone, org_address, org_gstin,
        from, to, party,
    );

    if let Some(first) = entries.first() {
        let opening = first.balance - first.credit + first.debit;
        let (val, is_neg) = if opening < 0 {
            (format!("-{}", format_paise(-opening)), true)
        } else {
            (format_paise(opening), false)
        };

        ensure_page_space(
            &doc, &mut layer, &mut y, 8.0,
            &font_bold, &font,
            org_name, org_email, org_phone, org_address, org_gstin,
            from, to, party,
        );

        set_text_color(&layer, 0.35, 0.40, 0.48);
        layer.use_text("Opening Balance", 8.0, Mm(35.0), Mm(y), &font);
        if is_neg {
            set_text_color(&layer, 0.82, 0.28, 0.25);
        } else {
            set_text_color(&layer, 0.10, 0.10, 0.10);
        }
        layer.use_text(val, 8.0, Mm(178.0), Mm(y), &font);
        y -= 6.0;
    }

    for entry in entries {
        let date = entry
            .date
            .to_string()
            .chars()
            .take(10)
            .collect::<String>();

        let desc = entry.description.as_deref().unwrap_or("-");
        let reference = entry.reference_number.as_deref().unwrap_or("-");
        let debit = if entry.debit > 0 { format_paise(entry.debit) } else { String::new() };
        let credit = if entry.credit > 0 { format_paise(entry.credit) } else { String::new() };

        let desc_lines = wrap_text(desc, 48);
        let row_height = (desc_lines.len().max(1) as f32 * 4.5f32).max(6.0f32) + 1.0f32;

        ensure_page_space(
            &doc, &mut layer, &mut y, row_height,
            &font_bold, &font,
            org_name, org_email, org_phone, org_address, org_gstin,
            from, to, party,
        );

        render_ledger_table_row(
            &layer,
            &font,
            &date,
            desc,
            reference,
            &debit,
            &credit,
            entry.balance,
            y,
        );

        y -= row_height;
    }

    if !entries.is_empty() {
        let closing_row_height = 10.0f32;
        ensure_page_space(
            &doc, &mut layer, &mut y, closing_row_height,
            &font_bold, &font,
            org_name, org_email, org_phone, org_address, org_gstin,
            from, to, party,
        );

        y -= 2.0;
        draw_line(&layer, 15.0, 200.0, y as f32);
        y -= 6.0;

        if let Some(last) = entries.last() {
            let (val, is_neg) = if last.balance < 0 {
                (format!("-{}", format_paise(-last.balance)), true)
            } else {
                (format_paise(last.balance), false)
            };
            set_text_color(&layer, 0.35, 0.40, 0.48);
            layer.use_text("Closing Balance", 8.5, Mm(135.0), Mm(y), &font_bold);
            if is_neg {
                set_text_color(&layer, 0.82, 0.28, 0.25);
            } else {
                set_text_color(&layer, 0.10, 0.45, 0.20);
            }
            layer.use_text(val, 10.5, Mm(178.0), Mm(y), &font_bold);
        }
    }

    let mut buf = std::io::BufWriter::new(Vec::new());
    doc.save(&mut buf).unwrap();
    buf.into_inner().unwrap()
}

/// GET /api/v1/ledger/pdf?from=&to=&party_id=
#[get("/ledger/pdf")]
pub async fn get_ledger_pdf(
    service: web::Data<LedgerService>,
    org_service: web::Data<OrganisationService>,
    customer_repo: web::Data<CustomerRepository>,
    query: web::Query<LedgerQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let q = query.into_inner();
    let from = q.from.clone().unwrap_or_default();
    let to = q.to.clone().unwrap_or_default();
    let party_id = match q.party_id {
        Some(ref v) => Some(ObjectId::parse_str(v)
            .map_err(|_| actix_web::error::ErrorBadRequest("Invalid party ID"))?),
        None => None,
    };

    let result = service.query(&org_id, party_id, Some(from.clone()).filter(|s| !s.is_empty()), Some(to.clone()).filter(|s| !s.is_empty()), None, None).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let org = org_service.get_organisation_by_id(&org_id.to_string()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let org_address = org.addresses.first().map(|a| a.value.clone()).unwrap_or_default();

    let party_info: Option<PartyInfo> = if let Some(pid) = party_id {
        if let Ok(Some(c)) = customer_repo.find_by_id(&pid.to_hex()).await {
            Some(PartyInfo {
                name: if !c.company_name.is_empty() { c.company_name } else { c.customer_name },
                email: c.email,
                phone: c.phone,
                address: c.addresses.first().map(|a| a.value.clone()).unwrap_or_default(),
                gstin: c.gst_in,
            })
        } else { None }
    } else { None };

    let pdf_bytes = generate_ledger_pdf(
        &result.data,
        &org.company_name,
        &org.email,
        &org.phone,
        &org_address,
        &org.gst_in,
        &from,
        &to,
        party_info.as_ref(),
    );

    Ok(HttpResponse::Ok()
        .content_type("application/pdf")
        .append_header(("Content-Disposition", "attachment; filename=\"ledger.pdf\""))
        .body(pdf_bytes))
}

/// POST /api/v1/ledger/recalculate
/// Admin-only: recalculates and patches balance on all ledger entries for the org.
/// Safe to run on production — only writes entries where balance is wrong.
#[actix_web::post("/ledger/recalculate")]
pub async fn recalculate_ledger_balances(
    service: web::Data<LedgerService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    // Admin only
    if !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "message": "Admin access required"
        })));
    }

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let (entries_fixed, parties_fixed) = service
        .recalculate_balances(&org_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Ledger balances recalculated successfully",
        "entries_fixed": entries_fixed,
        "parties_fixed": parties_fixed
    })))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_ledger)
        .service(get_ledger_pdf)
        .service(recalculate_ledger_balances);
}
