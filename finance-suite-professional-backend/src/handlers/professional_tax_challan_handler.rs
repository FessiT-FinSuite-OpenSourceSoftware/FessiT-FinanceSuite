use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use futures::StreamExt;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::professional_tax_challan::ProfessionalTaxChallan,
    services::professional_tax_challan_service::ProfessionalTaxChallanService,
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

const UPLOAD_DIR: &str = "./uploads/pt_challans";

fn parse_f64(s: &str) -> f64 {
    s.parse::<f64>().unwrap_or(0.0)
}

/// POST /api/v1/pt-challans
#[post("/pt-challans")]
pub async fn create_pt_challan(
    service: web::Data<ProfessionalTaxChallanService>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut stored_filename = String::new();

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        if field_name == "file" && original_name.is_some() {
            let original = original_name.unwrap();
            let ext = std::path::Path::new(&original).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
            let stored = if ext.is_empty() { format!("{}.bin", Uuid::new_v4()) } else { format!("{}.{}", Uuid::new_v4(), ext) };
            let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
            let filepath_clone = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await.map_err(actix_web::error::ErrorInternalServerError)??;
            }
            stored_filename = stored;
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }

    let challan = ProfessionalTaxChallan {
        id: None,
        challan_no: fields.remove("challan_no").unwrap_or_default(),
        section: fields.remove("section").unwrap_or_default(),
        tds_section_key: fields.remove("tds_section_key").unwrap_or_default(),
        tds_section_new: fields.remove("tds_section_new").unwrap_or_default(),
        tds_section_old: fields.remove("tds_section_old").unwrap_or_default(),
        tds_section_nature: fields.remove("tds_section_nature").unwrap_or_default(),
        period: fields.remove("period").unwrap_or_default(),
        payment_date: fields.remove("payment_date").unwrap_or_default(),
        date_of_challan: fields.remove("date_of_challan").unwrap_or_default(),
        amount_paid: parse_f64(&fields.remove("amount_paid").unwrap_or_default()),
        tax_year: fields.remove("tax_year").unwrap_or_default(),
        payment_type: fields.remove("payment_type").unwrap_or_default(),
        bank_reference_no: fields.remove("bank_reference_no").unwrap_or_default(),
        file: stored_filename,
        mode_of_payment: fields.remove("mode_of_payment").unwrap_or_default(),
        notes: fields.remove("notes").unwrap_or_default(),
        organisation_id: None,
    };

    let saved = service.create(challan, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

/// GET /api/v1/pt-challans
#[get("/pt-challans")]
pub async fn list_pt_challans(
    service: web::Data<ProfessionalTaxChallanService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let challans = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(challans))
}

/// GET /api/v1/pt-challans/{id}
#[get("/pt-challans/{id}")]
pub async fn get_pt_challan(
    service: web::Data<ProfessionalTaxChallanService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    match service.get_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(c) if c.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(c)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "PT Challan not found" }))),
    }
}

/// PUT /api/v1/pt-challans/{id}
#[put("/pt-challans/{id}")]
pub async fn update_pt_challan(
    service: web::Data<ProfessionalTaxChallanService>,
    id: Path<String>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "PT Challan not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut new_filename: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        if field_name == "file" && original_name.is_some() {
            let original = original_name.unwrap();
            let ext = std::path::Path::new(&original).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
            let stored = if ext.is_empty() { format!("{}.bin", Uuid::new_v4()) } else { format!("{}.{}", Uuid::new_v4(), ext) };
            let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
            let filepath_clone = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await.map_err(actix_web::error::ErrorInternalServerError)??;
            }
            if !existing.file.is_empty() {
                let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.file));
            }
            new_filename = Some(stored);
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }

    let updated = ProfessionalTaxChallan {
        id: None,
        challan_no: fields.remove("challan_no").unwrap_or(existing.challan_no),
        section: fields.remove("section").unwrap_or(existing.section),
        tds_section_key: fields.remove("tds_section_key").unwrap_or(existing.tds_section_key),
        tds_section_new: fields.remove("tds_section_new").unwrap_or(existing.tds_section_new),
        tds_section_old: fields.remove("tds_section_old").unwrap_or(existing.tds_section_old),
        tds_section_nature: fields.remove("tds_section_nature").unwrap_or(existing.tds_section_nature),
        period: fields.remove("period").unwrap_or(existing.period),
        payment_date: fields.remove("payment_date").unwrap_or(existing.payment_date),
        date_of_challan: fields.remove("date_of_challan").unwrap_or(existing.date_of_challan),
        amount_paid: fields.remove("amount_paid").map(|v| parse_f64(&v)).unwrap_or(existing.amount_paid),
        tax_year: fields.remove("tax_year").unwrap_or(existing.tax_year),
        payment_type: fields.remove("payment_type").unwrap_or(existing.payment_type),
        bank_reference_no: fields.remove("bank_reference_no").unwrap_or(existing.bank_reference_no),
        file: new_filename.unwrap_or(existing.file),
        mode_of_payment: fields.remove("mode_of_payment").unwrap_or(existing.mode_of_payment),
        notes: fields.remove("notes").unwrap_or(existing.notes),
        organisation_id: existing.organisation_id,
    };

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(c) => Ok(HttpResponse::Ok().json(c)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "PT Challan not found" }))),
    }
}

/// DELETE /api/v1/pt-challans/{id}
#[delete("/pt-challans/{id}")]
pub async fn delete_pt_challan(
    service: web::Data<ProfessionalTaxChallanService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let id = id.into_inner();
    match service.get_by_id(&id).await.map_err(actix_web::error::ErrorInternalServerError)? {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "PT Challan not found" }))),
        Some(c) if c.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        Some(c) => {
            if !c.file.is_empty() {
                let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&c.file));
            }
        }
    }
    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "PT Challan not found" })))
    }
}

/// GET /api/v1/pt-challan-files/{filename}
#[get("/pt-challan-files/{filename}")]
pub async fn get_pt_challan_file(
    path: Path<String>,
    service: web::Data<ProfessionalTaxChallanService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let filename = path.into_inner();
    let challans = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !challans.iter().any(|c| c.file == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_pt_challan_file)
        .service(create_pt_challan)
        .service(list_pt_challans)
        .service(get_pt_challan)
        .service(update_pt_challan)
        .service(delete_pt_challan);
}
