use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use futures::StreamExt;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::incoming_invoice::{CreateIncomingInvoiceRequest, UpdateIncomingInvoiceRequest},
    services::IncomingInvoiceService,
    services::LedgerService,
    services::salary_service::SalaryService,
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

const UPLOAD_DIR: &str = "./uploads/incoming_invoices";

/// POST /api/v1/incoming-invoices
#[post("/incoming-invoices")]
pub async fn create_incoming_invoice(
    service: web::Data<IncomingInvoiceService>,
    req: Json<CreateIncomingInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let invoice = service.create(req.into_inner(), &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(invoice))
}

/// GET /api/v1/incoming-invoices
#[get("/incoming-invoices")]
pub async fn list_incoming_invoices(
    service: web::Data<IncomingInvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let invoices = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(invoices))
}

/// GET /api/v1/incoming-invoices/{id}
#[get("/incoming-invoices/{id}")]
pub async fn get_incoming_invoice(
    service: web::Data<IncomingInvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    match service.get_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(inv) if inv.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(inv)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

fn parse_amount(s: &str) -> f64 {
    s.trim().chars().filter(|c| c.is_ascii_digit() || *c == '.').collect::<String>().parse::<f64>().unwrap_or(0.0)
}

/// PUT /api/v1/incoming-invoices/{id}
#[put("/incoming-invoices/{id}")]
pub async fn update_incoming_invoice(
    service: web::Data<IncomingInvoiceService>,
    ledger_service: web::Data<LedgerService>,
    id: Path<String>,
    req: Json<UpdateIncomingInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Invoice not found" })))?;
    if existing.status.to_lowercase() == "paid" && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify a Paid invoice"
        })));
    }
    let mut updated_req = req.into_inner();
    updated_req.vendor_id = existing.vendor_id.clone();
    updated_req.organisation_id = existing.organisation_id;
    if updated_req.status != "Paid" {
        updated_req.paid_date = existing.paid_date;
    }
    let was_paid = existing.status.to_lowercase() == "paid";
    match service.update(&id, updated_req).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(inv) => {
            let now_paid = inv.status.to_lowercase() == "paid";
            if now_paid && !was_paid {
                if let Some(org_id) = inv.organisation_id {
                    if let Ok(inv_id) = mongodb::bson::oid::ObjectId::parse_str(&id) {
                        let amount = parse_amount(&inv.total);
                        let currency = if inv.currency_type.is_empty() { "INR" } else { &inv.currency_type };
                        if let Err(e) = ledger_service.record_incoming_invoice_payment(
                            &inv_id,
                            &inv.invoice_number,
                            &inv.vendor_name,
                            amount,
                            currency,
                            &org_id,
                            mongodb::bson::DateTime::now(),
                            user.id.as_ref(),
                        ).await {
                            log::error!("Ledger entry failed for incoming invoice {}: {}", id, e);
                        }
                    }
                }
            }
            Ok(HttpResponse::Ok().json(inv))
        },
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

/// PUT /api/v1/incoming-invoice-files/{id}
/// Accepts multipart/form-data with all invoice fields + optional "invoice_file".
/// If a new file is provided, the old file is deleted from disk and replaced.
#[put("/incoming-invoice-files/{id}")]
pub async fn update_incoming_invoice_with_file(
    service: web::Data<IncomingInvoiceService>,
    id: Path<String>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Invoice not found" })))?;
    if existing.status.to_lowercase() == "paid" && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify a Paid invoice"
        })));
    }

    // Collect all multipart fields
    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut new_filename: Option<String> = None;

    use std::fs;
    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };
        if field_name == "invoice_file" && original_name.is_some() {
            // Save new file
            let original = original_name.unwrap();
            let ext = std::path::Path::new(&original).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
            let stored = if ext.is_empty() { format!("{}.bin", Uuid::new_v4()) } else { format!("{}.{}", Uuid::new_v4(), ext) };
            let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
            let filepath_clone = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await.map_err(actix_web::error::ErrorInternalServerError)??;
            }
            new_filename = Some(stored);
        } else {
            // Collect text field
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            let value = String::from_utf8(bytes).unwrap_or_default();
            fields.insert(field_name, value);
        }
    }

    // Delete old file if a new one was uploaded
    if let Some(ref new_name) = new_filename {
        let old_file = existing.invoice_file.trim().to_string();
        if !old_file.is_empty() {
            let old_path = std::path::Path::new(UPLOAD_DIR).join(&old_file);
            if old_path.exists() {
                let _ = std::fs::remove_file(&old_path);
            }
        }
        fields.insert("invoice_file".to_string(), new_name.clone());
    }

    // Build UpdateIncomingInvoiceRequest from collected fields
    use crate::models::incoming_invoice::IncomingInvoiceItem;
    let items: Vec<IncomingInvoiceItem> = fields.get("items")
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let req = crate::models::incoming_invoice::UpdateIncomingInvoiceRequest {
        id: None,
        vendor_name: fields.remove("vendor_name").unwrap_or_default(),
        invoice_type: fields.remove("invoice_type").unwrap_or_default(),
        vendor_gstin: fields.remove("vendor_gstin").unwrap_or_default(),
        vendor_address: fields.remove("vendor_address").unwrap_or_default(),
        invoice_number: fields.remove("invoice_number").unwrap_or_default(),
        invoice_date: fields.remove("invoice_date").unwrap_or_default(),
        due_date: fields.remove("due_date").unwrap_or_default(),
        place_of_supply: fields.remove("place_of_supply").unwrap_or_default(),
        currency_type: fields.remove("currency_type").unwrap_or_default(),
        purchase_order_id: fields.remove("purchase_order_id").unwrap_or_default(),
        items,
        sub_total: fields.remove("subTotal").unwrap_or_default(),
        total_cgst: fields.remove("total_cgst").unwrap_or_default(),
        total_sgst: fields.remove("total_sgst").unwrap_or_default(),
        total_igst: fields.remove("total_igst").unwrap_or_default(),
        total: fields.remove("total").unwrap_or_default(),
        invoice_file: fields.remove("invoice_file").unwrap_or_else(|| existing.invoice_file.clone()),
        notes: fields.remove("notes").unwrap_or_default(),
        status: fields.remove("status").unwrap_or_default(),
        approved_date: fields.remove("approved_date"),
        paid_date: if fields.get("status").map(|s| s.as_str()) == Some("Paid") {
            fields.remove("paid_date").or(existing.paid_date)
        } else {
            existing.paid_date
        },
        tds_applicable: fields.remove("tds_applicable").map(|v| v == "true" || v == "1").unwrap_or(existing.tds_applicable),
        tds_total: fields.remove("tds_total").unwrap_or(existing.tds_total),
        organisation_id: existing.organisation_id,
        vendor_id: existing.vendor_id,
    };

    match service.update(&id, req).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(inv) => Ok(HttpResponse::Ok().json(inv)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

/// DELETE /api/v1/incoming-invoices/{id}
#[delete("/incoming-invoices/{id}")]
pub async fn delete_incoming_invoice(
    service: web::Data<IncomingInvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let deleted = service.delete(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" })))
    }
}

/// POST /api/v1/incoming-invoice-files
/// Accepts multipart/form-data with field "file", saves it, returns { filename }
#[post("/incoming-invoice-files")]
pub async fn upload_incoming_invoice_file(mut payload: Multipart) -> actix_web::Result<impl Responder> {
    use std::fs;
    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };
        if field_name != "file" { continue; }
        let original = original_name.unwrap_or_else(|| "file".to_string());
        let ext = std::path::Path::new(&original).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let stored = if ext.is_empty() { format!("{}.bin", Uuid::new_v4()) } else { format!("{}.{}", Uuid::new_v4(), ext) };
        let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
        let filepath_clone = filepath.clone();
        let mut f = web::block(move || std::fs::File::create(&filepath_clone))
            .await.map_err(actix_web::error::ErrorInternalServerError)??;
        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
            f = web::block(move || f.write_all(&data).map(|_| f))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
        }
        return Ok(HttpResponse::Ok().json(json!({ "filename": stored, "original": original })));
    }
    Err(actix_web::error::ErrorBadRequest("No file field found"))
}

/// GET /api/v1/incoming-invoice-files/{filename}
/// Serves the stored invoice file — only accessible to authenticated users in the same org
/// that owns an invoice referencing this file.
#[get("/incoming-invoice-files/{filename}")]
pub async fn get_incoming_invoice_file(
    path: Path<String>,
    service: web::Data<IncomingInvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    // 1. Verify JWT
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    // 2. Load user
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    // 3. Must have read permission on Expenses module
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    // 4. Verify the file belongs to an invoice in the user's org
    let filename = path.into_inner();
    let invoices = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let owned = invoices.iter().any(|inv| inv.invoice_file == filename);
    if !owned {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    // 5. Serve the file
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

/// GET /api/v1/incoming-invoices/tds-summary
/// Returns combined TDS summary: incoming invoices (tds_applicable) + salaries for current month
#[get("/incoming-invoices/tds-summary")]
pub async fn get_tds_summary(
    service: web::Data<IncomingInvoiceService>,
    salary_service: web::Data<SalaryService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let (invoice_tds, salary_tds) = tokio::try_join!(
        async { service.get_monthly_tds_summary(&org_id).await
            .map_err(actix_web::error::ErrorInternalServerError) },
        async { salary_service.get_monthly_tds_summary(&org_id).await
            .map_err(actix_web::error::ErrorInternalServerError) },
    )?;

    let total_tds_deducted = invoice_tds.total_tds_deducted + salary_tds.total_tds_deducted;
    let tds_on_paid        = invoice_tds.tds_on_paid        + salary_tds.tds_on_paid;
    let tds_pending        = invoice_tds.tds_pending        + salary_tds.tds_pending;

    Ok(HttpResponse::Ok().json(json!({
        "month": invoice_tds.month,
        "incoming_invoices": {
            "invoice_count":       invoice_tds.invoice_count,
            "total_tds_deducted":  invoice_tds.total_tds_deducted,
            "tds_on_paid":         invoice_tds.tds_on_paid,
            "tds_pending":         invoice_tds.tds_pending
        },
        "salaries": {
            "salary_count":        salary_tds.salary_count,
            "total_tds_deducted":  salary_tds.total_tds_deducted,
            "tds_on_paid":         salary_tds.tds_on_paid,
            "tds_pending":         salary_tds.tds_pending
        },
        "combined": {
            "total_tds_deducted":  total_tds_deducted,
            "tds_on_paid":         tds_on_paid,
            "tds_pending":         tds_pending
        }
    })))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(upload_incoming_invoice_file)
        .service(get_incoming_invoice_file)
        .service(update_incoming_invoice_with_file)
        .service(get_tds_summary)
        .service(create_incoming_invoice)
        .service(list_incoming_invoices)
        .service(get_incoming_invoice)
        .service(update_incoming_invoice)
        .service(delete_incoming_invoice);
}
