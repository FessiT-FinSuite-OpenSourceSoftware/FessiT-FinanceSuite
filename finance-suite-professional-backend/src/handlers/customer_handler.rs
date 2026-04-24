use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest, HttpMessage};
use serde::Deserialize;

use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, UpdateCustomerRequest};
use crate::models::customer::Project;
use crate::services::CustomerService;
use crate::utils::auth::Claims;
use crate::utils::permissions::{check_permission, create_permission_error, Module, PermissionAction};

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

#[derive(Deserialize)]
pub struct DeleteQuery {
    gstin: Option<String>,
    email: Option<String>,
}

#[derive(Deserialize)]
pub struct ProjectIndexPath {
    id: String,
    index: usize,
}

#[get("/projects")]
pub async fn get_all_projects(
    service: web::Data<CustomerService>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&permissions, Module::Customers, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let projects = service.get_all_projects_by_organisation(&user.organisation_id.unwrap()).await?;
    Ok(HttpResponse::Ok().json(projects))
}

#[post("/customers/{id}/projects")]
pub async fn add_project(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    req: web::Json<Project>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&permissions, Module::Customers, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let customer = service.add_project(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Project added successfully", "projects": customer.projects })))
}

#[put("/customers/{id}/projects/{index}")]
pub async fn update_project(
    service: web::Data<CustomerService>,
    path: web::Path<ProjectIndexPath>,
    req: web::Json<Project>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&permissions, Module::Customers, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let customer = service.update_project(&path.id, path.index, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Project updated successfully", "projects": customer.projects })))
}

#[delete("/customers/{id}/projects/{index}")]
pub async fn delete_project(
    service: web::Data<CustomerService>,
    path: web::Path<ProjectIndexPath>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;
    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;
    check_permission(&permissions, Module::Customers, PermissionAction::Delete, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    let customer = service.delete_project(&path.id, path.index).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Project deleted successfully", "projects": customer.projects })))
}

#[post("/customers")]
pub async fn create_customer(
    service: web::Data<CustomerService>,
    req: web::Json<CreateCustomerRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let mut customer_data = req.into_inner();
    print!("Got some info while creating customer {:?}", customer_data);
    let _customer = service.create_customer(customer_data, user.organisation_id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Customer created successfully"
    })))
}

#[get("/customers")]
pub async fn get_all_customers(
    service: web::Data<CustomerService>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let customers = service.get_customers_by_organisation(&user.organisation_id.unwrap()).await?;
    Ok(HttpResponse::Ok().json(customers))
}

#[get("/customers/{id}/projects")]
pub async fn get_customer_projects(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let customer = service.get_customer_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(customer.projects))
}

#[get("/customers/{id}")]
pub async fn get_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let customer = service.get_customer_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(customer))
}

#[put("/customer/{id}")]
pub async fn update_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    req: web::Json<UpdateCustomerRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Write, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let _customer = service.update_customer(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Customer updated successfully"
    })))
}

#[delete("/customer/{id}")]
pub async fn delete_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Delete, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let deleted = service.delete_customer(&id).await?;
    if deleted {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Customer deleted successfully"
        })))
    } else {
        Err(ApiError::NotFound("Customer not found".to_string()))
    }
}

#[delete("/customers")]
pub async fn delete_customer_by_query(
    service: web::Data<CustomerService>,
    query: web::Query<DeleteQuery>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Delete, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;
    if let Some(gstin) = &query.gstin {
        let deleted = service.delete_customer_by_gstin(gstin).await?;
        if deleted {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Customer deleted successfully",
                "gstin": gstin
            })))
        } else {
            Err(ApiError::NotFound(format!(
                "Customer with GSTIN '{}' not found",
                gstin
            )))
        }
    } else if let Some(email) = &query.email {
        let deleted = service.delete_customer_by_email(email).await?;
        if deleted {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Customer deleted successfully",
                "email": email
            })))
        } else {
            Err(ApiError::NotFound(format!(
                "Customer with email '{}' not found",
                email
            )))
        }
    } else {
        Err(ApiError::BadRequest(
            "Please provide either 'gstin' or 'email' query parameter".to_string(),
        ))
    }
}

#[get("/customers/search")]
pub async fn search_customers(
    service: web::Data<CustomerService>,
    query: web::Query<SearchQuery>,
    http_req: HttpRequest,
) -> Result<impl Responder, ApiError> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| ApiError::Unauthorized("Missing claims".to_string()))?;

    let permissions = service.get_user_permissions(&claims.sub).await?;
    let user = service.get_user_by_id(&claims.sub).await?;

    check_permission(&permissions, Module::Customers, PermissionAction::Read, user.is_admin)
        .map_err(|e| ApiError::Forbidden(create_permission_error(&e)))?;

    let customers = service.search_customers_by_organisation(&query.q, &user.organisation_id.unwrap()).await?;
    Ok(HttpResponse::Ok().json(customers))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_all_projects)
        .service(create_customer)
        .service(get_all_customers)
        .service(get_customer_projects)
        .service(add_project)
        .service(update_project)
        .service(delete_project)
        .service(get_customer_by_id)
        .service(update_customer)
        .service(delete_customer_by_id)
        .service(delete_customer_by_query)
        .service(search_customers);
}
