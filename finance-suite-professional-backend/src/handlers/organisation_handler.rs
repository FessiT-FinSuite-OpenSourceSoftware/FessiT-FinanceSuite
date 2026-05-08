use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest, UpdateOrganizationRequest};
use crate::services::OrganisationService;
use crate::utils::auth::Claims;
use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use futures::StreamExt;
use std::io::Write;
use uuid::Uuid;

const LOGO_UPLOAD_DIR: &str = "./uploads/org_logos";

fn remove_logo_file(filename: &str) {
    if filename.trim().is_empty()
        || filename.contains("..")
        || filename.contains('/')
        || filename.contains('\\')
    {
        return;
    }

    let filepath = std::path::Path::new(LOGO_UPLOAD_DIR).join(filename);
    if filepath.exists() {
        let _ = std::fs::remove_file(filepath);
    }
}

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
            log::info!(
                "🔄 Organisation not found by email, trying to find user with email: '{}'",
                email
            );
            // Fallback: Search for user with this email and get their organisation
            match service.get_organisation_by_user_email(&email).await {
                Ok(organisation) => {
                    log::info!(
                        "✅ Found organisation via user email: {:?}",
                        organisation.id
                    );
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
        .service(get_organisation_by_email)
        .service(get_organisation_by_id)
        .service(update_organisation)
        .service(delete_organisation_by_id)
        .service(upload_org_logo)
        .service(get_org_logo);
}

#[put("/organisation/{id}/logo")]
pub async fn upload_org_logo(
    service: web::Data<OrganisationService>,
    id: web::Path<String>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let _claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    std::fs::create_dir_all(LOGO_UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let org_id = id.into_inner();
    let old_logo = service
        .get_organisation_by_id(&org_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .logo;

    let mut stored_filename: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let cd = field.content_disposition();
        let field_name = cd.get_name().unwrap_or("").to_string();
        let original_name = cd.get_filename().map(|s| s.to_string());

        if field_name == "logo" && original_name.is_some() {
            let ext = std::path::Path::new(original_name.as_deref().unwrap_or(""))
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_string();
            let filename = if ext.is_empty() {
                format!("{}.bin", Uuid::new_v4())
            } else {
                format!("{}.{}", Uuid::new_v4(), ext)
            };
            let filepath = std::path::Path::new(LOGO_UPLOAD_DIR).join(&filename);
            let filepath_clone = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                .await
                .map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await
                    .map_err(actix_web::error::ErrorInternalServerError)??;
            }
            if let Some(previous_upload) = stored_filename.replace(filename) {
                remove_logo_file(&previous_upload);
            }
        }
    }

    let filename = stored_filename
        .ok_or_else(|| actix_web::error::ErrorBadRequest("No logo file provided"))?;

    let org = match service.update_logo(&org_id, filename.clone()).await {
        Ok(org) => org,
        Err(err) => {
            remove_logo_file(&filename);
            return Err(actix_web::error::ErrorInternalServerError(err));
        }
    };

    Ok(HttpResponse::Ok().json(org))
}

#[get("/organisation-logo/{filename}")]
pub async fn get_org_logo(
    path: web::Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let _claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let filename = path.into_inner();
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(actix_web::error::ErrorBadRequest("Invalid filename"));
    }
    let filepath = std::path::Path::new(LOGO_UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("Logo not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}
