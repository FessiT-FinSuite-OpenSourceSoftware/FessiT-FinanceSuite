use actix_web::{
    delete, get, patch, post, put,
    web::{self, Json, Path, Query},
    HttpMessage, HttpRequest, HttpResponse, Responder,
};
use mongodb::bson::oid::ObjectId;
use serde_json::json;

use crate::{
    models::{
        record::{UpdateRecordStatusRequest, UpdateRecordNotesRequest},
        transaction::{SaveTransactionsRequest, Transaction, UpdateNotesRequest},
    },
    repository::transaction_repository::TransactionFilterParams,
    services::transaction_service::TransactionService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

fn parse_oid(s: &str) -> Option<ObjectId> { ObjectId::parse_str(s).ok() }

/// GET /api/v1/transactions/records
#[get("/transactions/records")]
pub async fn list_records(
    service: web::Data<TransactionService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Read, user.is_admin || user.is_accountant)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let records = service.list_records(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(records))
}

/// GET /api/v1/transactions/by-record/{record_id}
#[get("/transactions/by-record/{record_id}")]
pub async fn list_by_record(
    service: web::Data<TransactionService>,
    record_id: Path<String>,
    query: Query<TransactionFilterParams>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Read, user.is_admin || user.is_accountant)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let rid = parse_oid(&record_id.into_inner())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid record id"))?;
    let params = query.into_inner();
    let (items, total, totals) = service.list_by_record_filtered(&org_id, &rid, &params).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "total": total, "totals": totals })))
}

/// GET /api/v1/transactions
#[get("/transactions")]
pub async fn list_transactions(
    service: web::Data<TransactionService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Read, user.is_admin || user.is_accountant)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let items = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(json!({ "data": items, "total": items.len() })))
}

/// POST /api/v1/transactions/save
#[post("/transactions/save")]
pub async fn save_transactions(
    service: web::Data<TransactionService>,
    req: Json<SaveTransactionsRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let body = req.into_inner();
    if body.title.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "detail": "Record title is required" })));
    }
    let saved = service.save_many(body.transactions, &org_id, body.title.trim()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(json!({ "saved": saved.len(), "transactions": saved })))
}

/// PUT /api/v1/transactions/{id}
#[put("/transactions/{id}")]
pub async fn update_transaction(
    service: web::Data<TransactionService>,
    id: Path<String>,
    req: Json<Transaction>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    let mut t = req.into_inner();
    t.organisation_id = Some(org_id);
    match service.update(&id, t).await.map_err(actix_web::error::ErrorInternalServerError)? {
        Some(updated) => Ok(HttpResponse::Ok().json(updated)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

/// DELETE /api/v1/transactions/records/{record_id}
#[delete("/transactions/records/{record_id}")]
pub async fn delete_record(
    service: web::Data<TransactionService>,
    record_id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let rid = parse_oid(&record_id.into_inner())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid record id"))?;
    let deleted = service.delete_record(&org_id, &rid).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(json!({ "deleted": deleted })))
}

/// DELETE /api/v1/transactions/{id}
#[delete("/transactions/{id}")]
pub async fn delete_transaction(
    service: web::Data<TransactionService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
        Some(t) if t.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }
    if service.delete(&id).await.map_err(actix_web::error::ErrorInternalServerError)? {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" })))
    }
}

/// PATCH /api/v1/transactions/records/{record_id}/notes
#[patch("/transactions/records/{record_id}/notes")]
pub async fn patch_record_notes(
    service: web::Data<TransactionService>,
    record_id: Path<String>,
    req: Json<UpdateRecordNotesRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Write, user.is_admin || user.is_accountant)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let rid = parse_oid(&record_id.into_inner())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid record id"))?;
    service.update_record_notes(&org_id, &rid, &req.into_inner().notes).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(json!({ "ok": true })))
}

/// PATCH /api/v1/transactions/records/{record_id}/status
#[patch("/transactions/records/{record_id}/status")]
pub async fn patch_record_status(
    service: web::Data<TransactionService>,
    record_id: Path<String>,
    req: Json<UpdateRecordStatusRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Transactions, PermissionAction::Write, user.is_admin || user.is_accountant)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let rid = parse_oid(&record_id.into_inner())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid record id"))?;
    let body = req.into_inner();
    let valid = ["notreviewed", "accepted", "rejected"];
    if !valid.contains(&body.status.as_str()) {
        return Ok(HttpResponse::BadRequest().json(json!({ "detail": "Invalid status" })));
    }
    service.update_record_status(&org_id, &rid, &body.status).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(json!({ "status": body.status })))
}

/// PATCH /api/v1/transactions/{id}/notes
#[patch("/transactions/{id}/notes")]
pub async fn patch_transaction_notes(
    service: web::Data<TransactionService>,
    id: Path<String>,
    req: Json<UpdateNotesRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    let body = req.into_inner();
    let mut updated = existing;
    updated.notes = body.notes;
    if let Some(s) = body.status { updated.status = s; }
    match service.update(&id, updated).await.map_err(actix_web::error::ErrorInternalServerError)? {
        Some(t) => Ok(HttpResponse::Ok().json(t)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(list_records)
       .service(list_by_record)
       .service(patch_record_notes)
       .service(patch_record_status)
       .service(delete_record)
       .service(list_transactions)
       .service(save_transactions)
       .service(update_transaction)
       .service(delete_transaction)
       .service(patch_transaction_notes);
}
