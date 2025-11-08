<<<<<<< HEAD
use actix_web::{web, HttpResponse};
=======
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::Deserialize;

>>>>>>> Phoenix-Reborn
use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, UpdateCustomerRequest};
use crate::services::CustomerService;

<<<<<<< HEAD
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
=======
#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

#[derive(Deserialize)]
pub struct DeleteQuery {
    gstin: Option<String>,
    email: Option<String>,
}

#[post("/api/v1/customers")]
pub async fn create_customer(
    service: web::Data<CustomerService>,
    req: web::Json<CreateCustomerRequest>,
) -> Result<impl Responder, ApiError> {
    let customer = service.create_customer(req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Customer created successfully"
    })))
}

#[get("/api/v1/customers")]
pub async fn get_all_customers(
    service: web::Data<CustomerService>,
) -> Result<impl Responder, ApiError> {
>>>>>>> Phoenix-Reborn
    let customers = service.get_all_customers().await?;
    Ok(HttpResponse::Ok().json(customers))
}

<<<<<<< HEAD
async fn get_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
=======
#[get("/api/v1/customers/{id}")]
pub async fn get_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
>>>>>>> Phoenix-Reborn
    let customer = service.get_customer_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(customer))
}

<<<<<<< HEAD
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
=======
#[put("/api/v1/customer/{id}")]
pub async fn update_customer(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
    req: web::Json<UpdateCustomerRequest>,
) -> Result<impl Responder, ApiError> {
    let customer = service.update_customer(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Customer updated successfully"
    })))
}

#[delete("/api/v1/customer/{id}")]
pub async fn delete_customer_by_id(
    service: web::Data<CustomerService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let deleted = service.delete_customer(&id).await?;
    if deleted {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Customer deleted successfully"
        })))
    } else {
        Err(ApiError::NotFound("Customer not found".to_string()))
    }
}

#[delete("/api/v1/customers")]
pub async fn delete_customer_by_query(
    service: web::Data<CustomerService>,
    query: web::Query<DeleteQuery>,
) -> Result<impl Responder, ApiError> {
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
) -> Result<impl Responder, ApiError> {
    let customers = service.search_customers(&query.q).await?;
    Ok(HttpResponse::Ok().json(customers))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_customer)
        .service(get_all_customers)
        .service(get_customer_by_id)
        .service(update_customer)
        .service(delete_customer_by_id)
        .service(delete_customer_by_query) // Add this new endpoint
        .service(search_customers);
}
>>>>>>> Phoenix-Reborn
