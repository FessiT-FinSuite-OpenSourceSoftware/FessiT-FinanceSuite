use actix_web::{get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};

use crate::{
    error::ApiError,
    models::service::{CreateServiceRequest, UpdateServiceRequest},
    services::service_service::ServiceService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

#[post("/services")]
pub async fn create_service(
    service: web::Data<ServiceService>,
    req: web::Json<CreateServiceRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::ValidationError("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    check_permission(&user.permissions, Module::Organisation, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::ValidationError(create_permission_error(&e)))?;

    let org_id = user
        .organisation_id
        .ok_or_else(|| ApiError::ValidationError("User has no organisation".to_string()))?;
    let service_data = service.create(req.into_inner(), &org_id).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    Ok(HttpResponse::Ok().json(service_data))
}

#[get("/services")]
pub async fn list_services(
    service: web::Data<ServiceService>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::ValidationError("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    print!("👤 👤 👤 👤 User: {:?}", user);
    check_permission(&user.permissions, Module::Organisation, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::ValidationError(create_permission_error(&e)))?;


    let org_id = user
        .organisation_id
        .ok_or_else(|| ApiError::ValidationError("User has no organisation".to_string()))?;
    print!("➕ ➕ ➕ ➕ Org ID: {:?}", org_id);

    let services = service.list(&org_id).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    print!("📋 📋 📋 📋 Services: {:?}", services);
    Ok(HttpResponse::Ok().json(services))
}

#[get("/services/{id}")]
pub async fn get_service_by_id(
    service: web::Data<ServiceService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::ValidationError("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    check_permission(&user.permissions, Module::Organisation, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::ValidationError(create_permission_error(&e)))?;

    let org_id = user
        .organisation_id
        .ok_or_else(|| ApiError::ValidationError("User has no organisation".to_string()))?;
    let service_data = service.get_by_id(&id).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    match service_data {
        Some(service_data) if service_data.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(service_data)),
        Some(_) => Err(ApiError::ValidationError("Service not found".to_string())),
        None => Err(ApiError::ValidationError("Service not found".to_string())),
    }
}

#[put("/services/{id}")]
pub async fn update_service(
    service: web::Data<ServiceService>,
    id: web::Path<String>,
    req: web::Json<UpdateServiceRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::ValidationError("Missing claims".to_string()))?;
    let user = service.get_user_by_id(&claims.sub).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    check_permission(&user.permissions, Module::Organisation, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::ValidationError(create_permission_error(&e)))?;

    let org_id = user
        .organisation_id
        .ok_or_else(|| ApiError::ValidationError("User has no organisation".to_string()))?;
    let existing = service.get_by_id(&id).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    let existing = existing.ok_or_else(|| ApiError::ValidationError("Service not found".to_string()))?;
    if existing.organisation_id != Some(org_id) {
        return Err(ApiError::ValidationError("Service not found".to_string()));
    }

    let mut service_data = req.into_inner();
    service_data.organisation_id = existing.organisation_id;
    let updated = service.update(&id, service_data).await.map_err(|e| ApiError::ValidationError(e.to_string()))?;
    match updated {
        Some(service_data) => Ok(HttpResponse::Ok().json(service_data)),
        None => Err(ApiError::ValidationError("Service not found".to_string())),
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_service)
        .service(list_services)
        .service(get_service_by_id)
        .service(update_service);
}
