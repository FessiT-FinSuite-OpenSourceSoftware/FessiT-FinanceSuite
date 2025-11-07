use actix_web::{web, HttpResponse};
use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, UpdateCustomerRequest};
use crate::services::CustomerService;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/customers")
            .route("", web::get().to(get_all_customers))
            .route("", web::post().to(create_customer))
            .route("/{id}", web::get().to(get_customer_by_id))
            .route("/{id}", web::put().to(update_customer))
            .route("/{id}", web::delete().to(delete_customer))
            .route("/search/{query}", web::get().to(search_customers))
    );
}

async fn create_customer(
    service: web::Data<CustomerService>,
    req: web::Json<CreateCustomerRequest>,
) -> Result<HttpResponse, ApiError> {
    let customer = service.create_customer(req.into_inner()).await?;
    Ok(HttpResponse::Created().json(customer))
}

async fn get_all_customers(
    service: web::Data<CustomerService>,
) -> Result<HttpResponse, ApiError> {
    let customers = service.get_all_customers().await?;
    Ok(HttpResponse::Ok().json(customers))
}

async fn get_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let customer = service.get_customer_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(customer))
}

async fn update_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    req: web::Json<UpdateCustomerRequest>,
) -> Result<HttpResponse, ApiError> {
    let customer = service.update_customer(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(customer))
}

async fn delete_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let deleted = service.delete_customer(&id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "deleted": deleted })))
}

async fn search_customers(
    service: web::Data<CustomerService>,
    query: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let customers = service.search_customers(&query).await?;
    Ok(HttpResponse::Ok().json(customers))
}
