use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use serde_json::json;

use crate::error::ApiError;
use crate::models::costcenter::{CreateCostCenterRequest, UpdateCostCenterRequest};
use crate::services::CostCenterService;
use crate::utils::auth::Claims;
use crate::utils::permissions::{check_permission, create_permission_error, Module, PermissionAction};

#[post("/cost-centers")]
pub async fn create_cost_center(
    service: web::Data<CostCenterService>,
    req: web::Json<CreateCostCenterRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&user.permissions, Module::CostCenter, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| ApiError::BadRequest("User has no organisation".to_string()))?;
    let cost_center = service.create_cost_center(req.into_inner(), org_id).await?;
    Ok(HttpResponse::Created().json(cost_center))
}

#[get("/cost-centers")]
pub async fn list_cost_centers(
    service: web::Data<CostCenterService>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&user.permissions, Module::CostCenter, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| ApiError::BadRequest("User has no organisation".to_string()))?;
    let list = service.get_cost_centers_by_org(&org_id).await?;
    Ok(HttpResponse::Ok().json(list))
}

#[get("/cost-centers/{id}")]
pub async fn get_cost_center(
    service: web::Data<CostCenterService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&user.permissions, Module::CostCenter, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    match service.get_cost_center_by_id(&id).await? {
        Some(cc) => Ok(HttpResponse::Ok().json(cc)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Cost center not found" }))),
    }
}

#[put("/cost-centers/{id}")]
pub async fn update_cost_center(
    service: web::Data<CostCenterService>,
    id: web::Path<String>,
    req: web::Json<UpdateCostCenterRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&user.permissions, Module::CostCenter, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    match service.update_cost_center(&id, req.into_inner()).await? {
        Some(cc) => Ok(HttpResponse::Ok().json(cc)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Cost center not found" }))),
    }
}

#[delete("/cost-centers/{id}")]
pub async fn delete_cost_center(
    service: web::Data<CostCenterService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&user.permissions, Module::CostCenter, PermissionAction::Delete, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let deleted = service.delete_cost_center(&id).await?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Cost center not found" })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_cost_center)
        .service(list_cost_centers)
        .service(get_cost_center)
        .service(update_cost_center)
        .service(delete_cost_center);
}
