use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, UpdateCustomerRequest};
use crate::services::CustomerService;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

#[post("/customers")]
pub async fn create_customer(
    service: web::Data<CustomerService>,
    req: web::Json<CreateCustomerRequest>,
) -> Result<impl Responder, ApiError> {
    let customer = service.create_customer(req.into_inner()).await?;
    Ok(HttpResponse::Created().json(customer))
}

#[get("/customers")]
pub async fn get_all_customers(
    service: web::Data<CustomerService>,
) -> Result<impl Responder, ApiError> {
    let customers = service.get_all_customers().await?;
    Ok(HttpResponse::Ok().json(customers))
}

#[get("/customers/{id}")]
pub async fn get_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let customer = service.get_customer_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(customer))
}

#[put("/customers/{id}")]
pub async fn update_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    req: web::Json<UpdateCustomerRequest>,
) -> Result<impl Responder, ApiError> {
    let customer = service.update_customer(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(customer))
}

#[delete("/customers/{id}")]
pub async fn delete_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let deleted = service.delete_customer(&id).await?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Err(ApiError::NotFound("Customer not found".to_string()))
    }
}

#[get("/customers/search")]
pub async fn search_customers(
    service: web::Data<CustomerService>,
    query: web::Query<SearchQuery>,
) -> Result<impl Responder, ApiError> {
    let customers = service.search_customers(&query.q).await?;
    Ok(HttpResponse::Ok().json(customers))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_customer)
        .service(get_all_customers)
        .service(get_customer_by_id)
        .service(update_customer)
        .service(delete_customer)
        .service(search_customers);
}