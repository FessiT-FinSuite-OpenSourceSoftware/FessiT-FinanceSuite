use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest, HttpMessage};
use serde_json::json;

use crate::{
    models::purchase_order::{CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest},
    services::PurchaseOrderService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

#[post("/purchase-orders")]
pub async fn create_purchase_order(
    service: web::Data<PurchaseOrderService>,
    req: web::Json<CreatePurchaseOrderRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let permissions = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    check_permission(&permissions, Module::PurchaseOrders, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let mut po_data = req.into_inner();
    po_data.organisation_id = user.organisation_id;

    let po = service
        .create_purchase_order(po_data)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    Ok(HttpResponse::Created().json(po))
}

#[get("/purchase-orders")]
pub async fn get_all_purchase_orders(
    service: web::Data<PurchaseOrderService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let permissions = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    check_permission(&permissions, Module::PurchaseOrders, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let pos = service
        .get_purchase_orders_by_organisation(&user.organisation_id.unwrap())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    Ok(HttpResponse::Ok().json(pos))
}

#[get("/purchase-orders/{id}")]
pub async fn get_purchase_order(
    service: web::Data<PurchaseOrderService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let permissions = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    check_permission(&permissions, Module::PurchaseOrders, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let maybe_po = service
        .get_purchase_order_by_id(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if let Some(po) = maybe_po {
        Ok(HttpResponse::Ok().json(po))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Purchase Order not found"
        })))
    }
}

#[put("/purchase-orders/{id}")]
pub async fn update_purchase_order(
    service: web::Data<PurchaseOrderService>,
    id: web::Path<String>,
    req: web::Json<UpdatePurchaseOrderRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let permissions = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    check_permission(&permissions, Module::PurchaseOrders, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let existing_po = service
        .get_purchase_order_by_id(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if existing_po.is_none() {
        return Ok(HttpResponse::NotFound().json(json!({
            "message": "Purchase Order not found"
        })));
    }

    let mut update_data = req.into_inner();
    update_data.organisation_id = existing_po.unwrap().organisation_id;

    let maybe_updated = service
        .update_purchase_order(&id, update_data)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if let Some(updated) = maybe_updated {
        Ok(HttpResponse::Ok().json(updated))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Purchase Order not found"
        })))
    }
}

#[delete("/purchase-orders/{id}")]
pub async fn delete_purchase_order(
    service: web::Data<PurchaseOrderService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let permissions = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    check_permission(&permissions, Module::PurchaseOrders, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let deleted = service
        .delete_purchase_order(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Purchase Order not found"
        })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_purchase_order)
        .service(get_all_purchase_orders)
        .service(get_purchase_order)
        .service(update_purchase_order)
        .service(delete_purchase_order);
}
