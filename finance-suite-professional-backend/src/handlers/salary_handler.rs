use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use serde_json::json;
use serde::Deserialize;

use crate::{
    models::salary::{CreateSalaryRequest, UpdateSalaryRequest, SalaryStatus},
    services::salary_service::SalaryService,
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
};

#[derive(Deserialize)]
struct PeriodQuery {
    year: Option<String>,
    month: Option<String>,
}

/// POST /api/v1/salaries
#[post("/salaries")]
pub async fn create_salary(
    service: web::Data<SalaryService>,
    req: Json<CreateSalaryRequest>,
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
    let salary = service.create(req.into_inner(), &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(salary))
}

/// GET /api/v1/salaries
#[get("/salaries")]
pub async fn list_salaries(
    service: web::Data<SalaryService>,
    query: web::Query<PeriodQuery>,
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
    let mut salaries = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if query.year.is_some() || query.month.is_some() {
        let now = chrono::Utc::now();
        let year  = query.year.clone().unwrap_or_else(|| now.format("%Y").to_string());
        let month = query.month.clone().unwrap_or_else(|| now.format("%m").to_string());
        salaries.retain(|s| {
            let p = s.period.trim();
            p.len() >= 7 && &p[0..4] == year.as_str() && &p[5..7] == month.as_str()
        });
    }
    Ok(HttpResponse::Ok().json(salaries))
}

/// GET /api/v1/salaries/{id}
#[get("/salaries/{id}")]
pub async fn get_salary(
    service: web::Data<SalaryService>,
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
        Some(s) if s.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(s)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Salary record not found" }))),
    }
}

/// PUT /api/v1/salaries/{id}
#[put("/salaries/{id}")]
pub async fn update_salary(
    service: web::Data<SalaryService>,
    id: Path<String>,
    req: Json<UpdateSalaryRequest>,
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
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Salary record not found" })))?;
    // Org ownership check
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    if existing.status == SalaryStatus::Paid && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify a Paid salary record"
        })));
    }
    let mut updated_salary = req.into_inner();
    // Always preserve the organisation_id from the existing record
    updated_salary.organisation_id = existing.organisation_id;
    match service.update(&id, updated_salary).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(s) => Ok(HttpResponse::Ok().json(s)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Salary record not found" }))),
    }
}

/// DELETE /api/v1/salaries/{id}
#[delete("/salaries/{id}")]
pub async fn delete_salary(
    service: web::Data<SalaryService>,
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
    // Org ownership check before delete
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Salary record not found" }))),
        Some(s) if s.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }
    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Salary record not found" })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_salary)
        .service(list_salaries)
        .service(get_salary)
        .service(update_salary)
        .service(delete_salary);
}
