use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpMessage, HttpRequest, HttpResponse, Responder,
};
use serde_json::json;

use crate::{
    models::transaction::{SaveTransactionsRequest, Transaction},
    services::transaction_service::TransactionService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

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
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let saved = service.save_many(req.into_inner().transactions, &org_id).await
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
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
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
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Delete, user.is_admin)
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

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(list_transactions)
        .service(save_transactions)
        .service(update_transaction)
        .service(delete_transaction);
}
