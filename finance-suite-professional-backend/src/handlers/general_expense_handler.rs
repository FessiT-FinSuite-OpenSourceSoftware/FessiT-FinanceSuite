use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use futures::StreamExt;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::general_expense::{CreateGeneralExpenseRequest, UpdateGeneralExpenseRequest, GeneralExpenseStatus},
    services::general_expense_service::GeneralExpenseService,
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

const UPLOAD_DIR: &str = "./uploads/general_expenses";

fn compute_gst_fields(mut expense: CreateGeneralExpenseRequest) -> CreateGeneralExpenseRequest {
    let tax = expense.total_cgst + expense.total_sgst + expense.total_igst;
    expense.tax_amount = Some(tax);
    expense.sub_total = expense.amount + tax;
    expense
}

fn validate_approved_date(expense: &CreateGeneralExpenseRequest) -> actix_web::Result<()> {
    if expense.status == GeneralExpenseStatus::Approved {
        let missing = match &expense.approved_date {
            None => true,
            Some(d) => d.trim().is_empty(),
        };
        if missing {
            return Err(actix_web::error::ErrorBadRequest(
                serde_json::json!({ "message": "Approved date is required when status is Approved" })
            ));
        }
    }
    Ok(())
}

/// POST /api/v1/general-expenses
#[post("/general-expenses")]
pub async fn create_general_expense(
    service: web::Data<GeneralExpenseService>,
    req: Json<CreateGeneralExpenseRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let expense = compute_gst_fields(req.into_inner());
    validate_approved_date(&expense)?;
    let expense = service.create(expense, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;;
    Ok(HttpResponse::Created().json(expense))
}

/// GET /api/v1/general-expenses
#[get("/general-expenses")]
pub async fn list_general_expenses(
    service: web::Data<GeneralExpenseService>,
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
    let expenses = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(expenses))
}

/// GET /api/v1/general-expenses/{id}
#[get("/general-expenses/{id}")]
pub async fn get_general_expense(
    service: web::Data<GeneralExpenseService>,
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
        Some(e) if e.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(e)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

/// PUT /api/v1/general-expenses/{id}
#[put("/general-expenses/{id}")]
pub async fn update_general_expense(
    service: web::Data<GeneralExpenseService>,
    id: Path<String>,
    req: Json<UpdateGeneralExpenseRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
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
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Not found" })))?;
    // Org ownership check
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    // Only admins can modify an Approved expense
    if existing.status == GeneralExpenseStatus::Approved && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify an Approved expense"
        })));
    }
    let mut updated = compute_gst_fields(req.into_inner());
    validate_approved_date(&updated)?;
    // Preserve organisation_id — frontend never sends it
    updated.organisation_id = existing.organisation_id;
    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) => Ok(HttpResponse::Ok().json(e)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
    }
}

/// DELETE /api/v1/general-expenses/{id}
#[delete("/general-expenses/{id}")]
pub async fn delete_general_expense(
    service: web::Data<GeneralExpenseService>,
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
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" }))),
        Some(e) if e.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }
    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Not found" })))
    }
}

/// POST /api/v1/general-expense-files
/// Upload a document file, returns { filename, original }
#[post("/general-expense-files")]
pub async fn upload_general_expense_file(mut payload: Multipart) -> actix_web::Result<impl Responder> {
    use std::fs;
    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };
        if field_name != "file" { continue; }
        let original = original_name.unwrap_or_else(|| "file".to_string());
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
        return Ok(HttpResponse::Ok().json(json!({ "filename": stored, "original": original })));
    }
    Err(actix_web::error::ErrorBadRequest("No file field found"))
}

/// GET /api/v1/general-expense-files/{filename}
/// Serve a document — only accessible to authenticated users in the same org
#[get("/general-expense-files/{filename}")]
pub async fn get_general_expense_file(
    path: Path<String>,
    service: web::Data<GeneralExpenseService>,
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
    let expenses = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !expenses.iter().any(|e| e.document == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(upload_general_expense_file)
        .service(get_general_expense_file)
        .service(create_general_expense)
        .service(list_general_expenses)
        .service(get_general_expense)
        .service(update_general_expense)
        .service(delete_general_expense);
}
