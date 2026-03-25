use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest, UpdateOrganizationRequest};
use crate::services::OrganisationService;

#[post("/organisation")]
pub async fn create_organisation(
    service: web::Data<OrganisationService>,
    req: web::Json<CreateOrganisationRequest>,
) -> Result<impl Responder, ApiError> {
    let organisation = service.create_organisation(req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Organisation created successfully",
        "organisation": organisation
    })))
}

#[get("/organisation")]
pub async fn get_all_organisation(
    service: web::Data<OrganisationService>,
) -> Result<impl Responder, ApiError> {
    let organisations = service.get_all_organisation().await?;
    Ok(HttpResponse::Ok().json(organisations))
}

#[get("/organisation/by-email/{email}")]
pub async fn get_organisation_by_email(
    service: web::Data<OrganisationService>,
    email: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let email = email.into_inner();
    log::info!("📧 Looking up organisation by email: '{}'", email);
    match service.get_organisation_by_email(&email).await {
        Ok(organisation) => {
            log::info!("✅ Found organisation: {:?}", organisation.id);
            Ok(HttpResponse::Ok().json(organisation))
        }
        Err(_) => {
            log::info!("🔄 Organisation not found by email, trying to find user with email: '{}'", email);
            // Fallback: Search for user with this email and get their organisation
            match service.get_organisation_by_user_email(&email).await {
                Ok(organisation) => {
                    log::info!("✅ Found organisation via user email: {:?}", organisation.id);
                    Ok(HttpResponse::Ok().json(organisation))
                }
                Err(e) => {
                    log::error!("❌ Organisation not found for email '{}': {:?}", email, e);
                    Err(e)
                }
            }
        }
    }
}

#[get("/organisation/{id}")]
pub async fn get_organisation_by_id(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let organisation = service.get_organisation_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(organisation))
}

#[put("/organisationsUpdate/{id}")]
pub async fn update_organisation(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
    req: web::Json<UpdateOrganizationRequest>,
) -> Result<impl Responder, ApiError> {
    service.update_organisation(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Organisation details updated successfully"
    })))
}

#[delete("/organisation/{id}")]
pub async fn delete_organisation_by_id(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    service.delete_organisation(&id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Organisation deleted successfully"
    })))
}

/// Public routes (no JWT required)
pub fn configure_public_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_organisation);
}

/// Protected routes (JWT required)
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_all_organisation)
        .service(get_organisation_by_email) // ✅ BEFORE {id}
        .service(get_organisation_by_id)
        .service(update_organisation)
        .service(delete_organisation_by_id);
}
