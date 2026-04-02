use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path, Query},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use serde_json::json;
use serde::Deserialize;

use crate::{
    models::invoice::{CreateInvoiceRequest, UpdateInvoiceRequest},
    services::{ExpenseService, GeneralExpenseService, IncomingInvoiceService, InvoiceService},
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

#[derive(Deserialize)]
struct OrgEmailQuery {
    org_email: String,
}

/// POST /api/v1/invoices
#[post("/invoices")]
pub async fn create_invoice(
    service: web::Data<InvoiceService>,
    req: Json<CreateInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user permissions from service
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Check write permission for invoices
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    // Get organisation_id from user
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let invoice = service
        .create_invoice(req.into_inner(), &org_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(invoice))
}

/// GET /api/v1/invoices/next-number
#[get("/invoices/next-number")]
pub async fn get_next_invoice_number(
    service: web::Data<InvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user from claims
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Get organisation_id from user
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let invoice_number = service
        .peek_next_invoice_number(&org_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(json!({
        "invoice_number": invoice_number
    })))
}

/// GET /api/v1/invoices
#[get("/invoices")]
pub async fn list_invoices(
    service: web::Data<InvoiceService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    log::info!("📋 Fetching invoices for user: {}", claims.email);

    // Get user permissions from service
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    log::info!("👤 User found: {}, Organisation ID: {:?}", user.email, user.organisation_id);

    // Check read permission for invoices
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    // Get invoices filtered by user's organisation
    let invoices = if let Some(org_id) = user.organisation_id {
        log::info!("🔍 Fetching invoices for organisation ID: {}", org_id);
        
        // Get organisation to fetch its email
        let org = service.get_organisation_by_id(&org_id.to_string())
            .await
            .map_err(|e| {
                log::error!("❌ Error fetching organisation: {}", e);
                actix_web::error::ErrorInternalServerError(e)
            })?;
        
        log::info!("🏢 Organisation email: {}", org.email);
        
        // Fetch invoices by BOTH organisation_id OR company_email
        service
            .get_invoices_by_org_or_email(&org_id, &org.email)
            .await
            .map_err(|e| {
                log::error!("❌ Error fetching invoices: {}", e);
                actix_web::error::ErrorInternalServerError(e)
            })?
    } else {
        log::warn!("⚠️ User has no organisation ID, returning empty list");
        Vec::new()
    };

    log::info!("✅ Returning {} invoices", invoices.len());
    Ok(HttpResponse::Ok().json(invoices))
}

/// GET /api/v1/invoices/{id}
#[get("/invoices/{id}")]
pub async fn get_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user permissions from service
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Check read permission for invoices
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let maybe_invoice = service
        .get_invoice_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(invoice) = maybe_invoice {
        // Check by org_id first
        let org_id_matches = invoice.organisation_id == Some(org_id);

        // Fall back to company_email check via org lookup
        let email_matches = if !org_id_matches {
            match service.get_organisation_by_id(&org_id.to_string()).await {
                Ok(org) => invoice.company_email == org.email,
                Err(_) => false,
            }
        } else {
            false
        };

        if org_id_matches || email_matches {
            Ok(HttpResponse::Ok().json(invoice))
        } else {
            Ok(HttpResponse::NotFound().json(json!({
                "message": "Invoice not found"
            })))
        }
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Invoice not found"
        })))
    }
}

/// PUT /api/v1/invoices/{id}
#[put("/invoices/{id}")]
pub async fn update_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
    req: Json<UpdateInvoiceRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user permissions from service
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Check write permission for invoices
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    // Fetch existing invoice to check its current status
    let existing = service
        .get_invoice_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Invoice not found" })))?;

    // Only admins can modify a Paid invoice
    if existing.status == crate::models::invoice::InvoiceStatus::Paid && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify a Paid invoice"
        })));
    }

    let maybe_updated = service
        .update_invoice(&id, req.into_inner())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(updated) = maybe_updated {
        Ok(HttpResponse::Ok().json(updated))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Invoice not found"
        })))
    }
}

/// DELETE /api/v1/invoices/{id}
#[delete("/invoices/{id}")]
pub async fn delete_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user permissions from service
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Check delete permission for invoices
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let deleted = service
        .delete_invoice(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Invoice not found"
        })))
    }
}

/// GET /api/v1/invoices/gst-summary
/// Returns total GST collected from invoices generated in the current month for the user's org
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
        .service(create_invoice)
        .service(list_invoices)
        .service(get_invoice)
        .service(update_invoice)
        .service(delete_invoice);
}
