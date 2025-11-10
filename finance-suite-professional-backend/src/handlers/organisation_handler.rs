use actix_web::{delete,get,post,put,web,HttpResponse,Responder};
use serde::Deserialize;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest,UpdateOrganizationRequest};
use crate::services::OrganisationService;

#[post("/api/v1/organisation")]
pub async fn create_organisation(
    service:web::Data<OrganisationService>,
    req:web::Json<CreateOrganisationRequest>,
)->Result<impl Responder,ApiError>{
    let organisation = service.create_organisation(req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message":"Organisation created successfuly",
        "organisation":organisation
    })))
}

#[get("/api/v1/organisation")]
pub async fn get_all_organisation(
    service: web::Data<OrganisationService>,
) -> Result<impl Responder, ApiError> {
    let organisations = service.get_all_organisation().await?;
    Ok(HttpResponse::Ok().json(organisations))
}

#[get("/api/v1/organisation/{id}")]
pub async fn get_organisation_by_id(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,

) -> Result<impl Responder, ApiError> {
    let organisations = service.get_organisation_by_id(&id).await?;
    Ok(HttpResponse::Ok().json(organisations))
}

#[get("/api/v1/organisation/email/{email}")]
pub async fn get_organisation_by_email(
    service: web::Data<OrganisationService>,
    email: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let organisation = service.get_organisation_by_email(&email).await?;
    Ok(HttpResponse::Ok().json(organisation))
}


#[put("/api/v1/organisation/{id}")]
pub async fn update_organisation(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
    req: web::Json<UpdateOrganizationRequest>,
) -> Result<impl Responder, ApiError> {
    let organisation = service.update_organisation(&id, req.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Organisation details updated successfully"
    })))
}
#[delete("/api/v1/organisation/{id}")]
pub async fn delete_organisation_by_id(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let deleted = service.delete_organisation(&id).await?;
    if deleted {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Organisation deleted successfully"
        })))
    } else {
        Err(ApiError::NotFound("Customer not found".to_string()))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig){
    cfg.service(create_organisation)
       .service(get_all_organisation)
       .service(get_organisation_by_id)
       .service(update_organisation)
       .service(get_organisation_by_email)
       .service(delete_organisation_by_id);
}