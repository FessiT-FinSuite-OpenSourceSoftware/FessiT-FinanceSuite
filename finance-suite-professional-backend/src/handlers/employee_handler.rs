use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Path},
    HttpMessage, HttpRequest, HttpResponse, Responder,
};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::employee::{Employee, EmployeeStatus, EmployeeType},
    services::employee_service::EmployeeService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

const UPLOAD_DIR: &str = "./uploads/employees";

#[derive(Deserialize)]
pub struct PageQuery {
    #[serde(default = "default_page")]
    page: u64,
    #[serde(default = "default_page_size")]
    page_size: u64,
    #[serde(default)]
    search: String,
    #[serde(default)]
    department: String,
    #[serde(default)]
    employee_type: String,
    #[serde(default)]
    status: String,
}

fn default_page() -> u64 { 1 }
fn default_page_size() -> u64 { 10 }

fn parse_employee_type(s: &str) -> EmployeeType {
    match s.trim().to_lowercase().as_str() {
        "contract" => EmployeeType::Contract,
        "intern"   => EmployeeType::Intern,
        _          => EmployeeType::Permanent,
    }
}

fn parse_employee_status(s: &str) -> EmployeeStatus {
    match s.trim().to_lowercase().as_str() {
        "probation" => EmployeeStatus::Probation,
        "relieved"  => EmployeeStatus::Relieved,
        _           => EmployeeStatus::FullTime,
    }
}

fn parse_oid(s: &str) -> Option<mongodb::bson::oid::ObjectId> {
    let s = s.trim();
    if s.is_empty() { return None; }
    mongodb::bson::oid::ObjectId::parse_str(s).ok()
}

/// Collect multipart fields + optional photo file. Returns (fields, stored_filename).
async fn collect_multipart(
    mut payload: Multipart,
) -> actix_web::Result<(std::collections::HashMap<String, String>, Option<String>)> {
    use std::fs;
    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut stored_photo: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        if field_name == "photo" && original_name.is_some() {
            let original = original_name.unwrap();
            let ext = std::path::Path::new(&original)
                .extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
            let stored = if ext.is_empty() {
                format!("{}.bin", Uuid::new_v4())
            } else {
                format!("{}.{}", Uuid::new_v4(), ext)
            };
            let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
            let fp = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&fp))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await.map_err(actix_web::error::ErrorInternalServerError)??;
            }
            stored_photo = Some(stored);
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }
    Ok((fields, stored_photo))
}

fn employee_from_fields(
    fields: &mut std::collections::HashMap<String, String>,
    photo: Option<String>,
    existing: Option<&Employee>,
) -> Employee {
    let ex = existing;
    Employee {
        id: None,
        first_name:            fields.remove("first_name").unwrap_or_else(|| ex.map(|e| e.first_name.clone()).unwrap_or_default()),
        last_name:             fields.remove("last_name").unwrap_or_else(|| ex.map(|e| e.last_name.clone()).unwrap_or_default()),
        emp_id:                fields.remove("emp_id").unwrap_or_else(|| ex.map(|e| e.emp_id.clone()).unwrap_or_default()),
        email:                 fields.remove("email").unwrap_or_else(|| ex.map(|e| e.email.clone()).unwrap_or_default()),
        personal_email:        fields.remove("personal_email").unwrap_or_else(|| ex.map(|e| e.personal_email.clone()).unwrap_or_default()),
        primary_contact:       fields.remove("primary_contact").unwrap_or_else(|| ex.map(|e| e.primary_contact.clone()).unwrap_or_default()),
        emergency_contact:     fields.remove("emergency_contact").unwrap_or_else(|| ex.map(|e| e.emergency_contact.clone()).unwrap_or_default()),
        communication_address: fields.remove("communication_address").unwrap_or_else(|| ex.map(|e| e.communication_address.clone()).unwrap_or_default()),
        permanent_address:     fields.remove("permanent_address").unwrap_or_else(|| ex.map(|e| e.permanent_address.clone()).unwrap_or_default()),
        pan_number:            fields.remove("pan_number").unwrap_or_else(|| ex.map(|e| e.pan_number.clone()).unwrap_or_default()),
        uan_number:            fields.remove("uan_number").unwrap_or_else(|| ex.map(|e| e.uan_number.clone()).unwrap_or_default()),
        passport_number:       fields.remove("passport_number").unwrap_or_else(|| ex.map(|e| e.passport_number.clone()).unwrap_or_default()),
        passport_issued_date:  fields.remove("passport_issued_date").unwrap_or_else(|| ex.map(|e| e.passport_issued_date.clone()).unwrap_or_default()),
        passport_expiry_date:  fields.remove("passport_expiry_date").unwrap_or_else(|| ex.map(|e| e.passport_expiry_date.clone()).unwrap_or_default()),
        employee_type: fields.remove("employee_type")
            .map(|s| parse_employee_type(&s))
            .unwrap_or_else(|| ex.map(|e| e.employee_type.clone()).unwrap_or_default()),
        status: fields.remove("status")
            .map(|s| parse_employee_status(&s))
            .unwrap_or_else(|| ex.map(|e| e.status.clone()).unwrap_or_default()),
        department:  fields.remove("department").unwrap_or_else(|| ex.map(|e| e.department.clone()).unwrap_or_default()),
        join_date:   fields.remove("join_date").unwrap_or_else(|| ex.map(|e| e.join_date.clone()).unwrap_or_default()),
        exit_date:   fields.remove("exit_date").unwrap_or_else(|| ex.map(|e| e.exit_date.clone()).unwrap_or_default()),
        reporting_manager_id: fields.remove("reporting_manager_id")
            .as_deref().and_then(parse_oid)
            .or_else(|| ex.and_then(|e| e.reporting_manager_id)),
        reporting_manager_name: None, // resolved by service
        photo: photo.unwrap_or_else(|| ex.map(|e| e.photo.clone()).unwrap_or_default()),
        organisation_id: ex.and_then(|e| e.organisation_id),
    }
}

/// POST /api/v1/employees  (multipart/form-data)
#[post("/employees")]
pub async fn create_employee(
    service: web::Data<EmployeeService>,
    payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let (mut fields, photo) = collect_multipart(payload).await?;
    let emp = employee_from_fields(&mut fields, photo, None);

    if emp.first_name.trim().is_empty() || emp.emp_id.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "first_name and emp_id are required" })));
    }

    let saved = service.create(emp, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

/// GET /api/v1/employees?page=1&page_size=10&search=
#[get("/employees")]
pub async fn list_employees(
    service: web::Data<EmployeeService>,
    query: web::Query<PageQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let page      = query.page.max(1);
    let page_size = query.page_size.clamp(1, 100);
    let search    = query.search.trim().to_string();
    let department = query.department.trim().to_string();
    let employee_type = query.employee_type.trim().to_string();
    let status = query.status.trim().to_string();

    let result = service
        .list_page(
            &org_id,
            &search,
            &department,
            &employee_type,
            &status,
            page,
            page_size,
        )
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let total_pages = ((result.total as f64) / (page_size as f64)).ceil() as u64;

    Ok(HttpResponse::Ok().json(json!({
        "data":        result.data,
        "total":       result.total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    })))
}

/// GET /api/v1/employees/all  — lightweight list for reporting manager dropdown
#[get("/employees/all")]
pub async fn list_all_employees(
    service: web::Data<EmployeeService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let all = service.get_all_for_org(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    // Return only id + name for the dropdown
    let slim: Vec<_> = all.iter().map(|e| json!({
        "id":   e.id.map(|o| o.to_hex()).unwrap_or_default(),
        "name": format!("{} {}", e.first_name, e.last_name).trim().to_string(),
        "emp_id": e.emp_id,
    })).collect();
    Ok(HttpResponse::Ok().json(slim))
}

/// GET /api/v1/employees/{id}
#[get("/employees/{id}")]
pub async fn get_employee(
    service: web::Data<EmployeeService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    match service.get_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) if e.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(e)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Employee not found" }))),
    }
}

/// PUT /api/v1/employees/{id}  (multipart/form-data)
#[put("/employees/{id}")]
pub async fn update_employee(
    service: web::Data<EmployeeService>,
    id: Path<String>,
    payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Employee not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    let (mut fields, new_photo) = collect_multipart(payload).await?;

    // Delete old photo if a new one was uploaded
    if let Some(ref np) = new_photo {
        if !existing.photo.is_empty() && existing.photo != *np {
            let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.photo));
        }
    }

    let mut updated = employee_from_fields(&mut fields, new_photo, Some(&existing));
    updated.organisation_id = existing.organisation_id;

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) => Ok(HttpResponse::Ok().json(e)),
        None    => Ok(HttpResponse::NotFound().json(json!({ "message": "Employee not found" }))),
    }
}

/// DELETE /api/v1/employees/{id}
#[delete("/employees/{id}")]
pub async fn delete_employee(
    service: web::Data<EmployeeService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Users, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let id = id.into_inner();
    match service.get_by_id(&id).await.map_err(actix_web::error::ErrorInternalServerError)? {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Employee not found" }))),
        Some(e) if e.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        Some(e) if !e.photo.is_empty() => {
            let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&e.photo));
        }
        _ => {}
    }
    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Employee not found" })))
    }
}

/// GET /api/v1/employee-photos/{filename}
#[get("/employee-photos/{filename}")]
pub async fn get_employee_photo(
    path: Path<String>,
    service: web::Data<EmployeeService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let filename = path.into_inner();
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(actix_web::error::ErrorBadRequest("Invalid filename"));
    }
    // Verify the photo belongs to this org
    let all = service.get_all_for_org(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !all.iter().any(|e| e.photo == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("Photo not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_employee_photo)
        .service(list_all_employees)
        .service(create_employee)
        .service(list_employees)
        .service(get_employee)
        .service(update_employee)
        .service(delete_employee);
}
