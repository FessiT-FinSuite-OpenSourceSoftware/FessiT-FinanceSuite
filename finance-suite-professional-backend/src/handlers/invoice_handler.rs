use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path, Query},
    HttpResponse, Responder,
};
use serde_json::json;
use serde::Deserialize;

use crate::{
    models::invoice::{CreateInvoiceRequest, UpdateInvoiceRequest},
    services::InvoiceService,
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
    query: Query<OrgEmailQuery>,
) -> actix_web::Result<impl Responder> {
    let invoice = service
        .create_invoice(req.into_inner(), &query.org_email)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(invoice))
}

/// GET /api/v1/invoices/next-number
#[get("/invoices/next-number")]
pub async fn get_next_invoice_number(
    service: web::Data<InvoiceService>,
    query: Query<OrgEmailQuery>,
) -> actix_web::Result<impl Responder> {
    let invoice_number = service
        .peek_next_invoice_number(&query.org_email)
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
) -> actix_web::Result<impl Responder> {
    let invoices = service
        .get_all_invoices()
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(invoices))
}

/// GET /api/v1/invoices/{id}
#[get("/invoices/{id}")]
pub async fn get_invoice(
    service: web::Data<InvoiceService>,
    id: Path<String>,
) -> actix_web::Result<impl Responder> {
    let id = id.into_inner();

    let maybe_invoice = service
        .get_invoice_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(invoice) = maybe_invoice {
        Ok(HttpResponse::Ok().json(invoice))
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
) -> actix_web::Result<impl Responder> {
    let id = id.into_inner();

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
) -> actix_web::Result<impl Responder> {
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

/// Register invoice routes under /api/v1
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_next_invoice_number)
        .service(create_invoice)
        .service(list_invoices)
        .service(get_invoice)
        .service(update_invoice)
        .service(delete_invoice);
}
