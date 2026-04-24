use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path, Query},
    HttpMessage, HttpRequest, HttpResponse, Responder,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{
    models::estimate::{Estimate, EstimateRequest, EstimateStatus},
    repository::estimate_repository::EstimateFilter,
    services::estimate_service::EstimateService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};
use mongodb::bson::oid::ObjectId;

#[derive(Debug, Deserialize, Default)]
pub struct EstimateQuery {
    pub status: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub search: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

impl EstimateQuery {
    /// True when at least one filter or pagination param is present.
    fn has_any(&self) -> bool {
        self.status.is_some()
            || self.customer_id.is_some()
            || self.from.is_some()
            || self.to.is_some()
            || self.search.is_some()
            || self.page.is_some()
            || self.limit.is_some()
    }
}

#[derive(Serialize)]
struct PagedResponse {
    data: Vec<Estimate>,
    total: u64,
    page: Option<u64>,
    limit: Option<i64>,
}

fn validate_estimate(e: &EstimateRequest) -> Option<&'static str> {
    if e.issue_date.trim().is_empty() {
        return Some("issueDate is required");
    }
    if e.currency.trim().is_empty() {
        return Some("currency is required");
    }
    if e.items.is_empty() {
        return Some("items must not be empty");
    }
    for item in &e.items {
        if item.name.trim().is_empty() {
            return Some("each item must have a name");
        }
        if item.quantity <= 0.0 {
            return Some("item quantity must be greater than 0");
        }
        if item.unit_price < 0.0 {
            return Some("item unitPrice must be non-negative");
        }
        if let Some(d) = item.discount {
            if !(0.0..=100.0).contains(&d) {
                return Some("item discount must be between 0 and 100");
            }
        }
        if let Some(t) = item.tax_rate {
            if !(0.0..=100.0).contains(&t) {
                return Some("item taxRate must be between 0 and 100");
            }
        }
    }
    if let Some(d) = e.discount {
        if !(0.0..=100.0).contains(&d) {
            return Some("discount must be between 0 and 100");
        }
    }
    None
}

/// GET /api/v1/estimates/next-number  — peek next estimate number without consuming it
#[get("/estimates/next-number")]
pub async fn get_next_estimate_number(
    service: web::Data<EstimateService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let estimate_number = service.peek_next_estimate_number(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(json!({ "estimate_number": estimate_number })))
}

/// POST /api/v1/estimates
#[post("/estimates")]
pub async fn create_estimate(
    service: web::Data<EstimateService>,
    body: Json<EstimateRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let user_id = user.id
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("User has no id"))?;

    let req = body.into_inner();
    if let Some(msg) = validate_estimate(&req) {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": msg })));
    }

    let estimate: Estimate = req.into();
    let saved = service.create(estimate, &org_id, &user_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

/// GET /api/v1/estimates
///
/// No params  → returns all estimates as a plain array.
/// Any param  → returns `{ data, total, page, limit }` with filters/pagination applied.
///
/// Query params:
///   status, customerId, from (issueDate >=), to (issueDate <=), search, page, limit
#[get("/estimates")]
pub async fn list_estimates(
    service: web::Data<EstimateService>,
    query: Query<EstimateQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let q = query.into_inner();

    if !q.has_any() {
        // Fast path — no params, return everything
        let all = service.list(&org_id).await
            .map_err(actix_web::error::ErrorInternalServerError)?;
        return Ok(HttpResponse::Ok().json(all));
    }

    // Validate customerId if provided
    let customer_oid = if let Some(ref cid) = q.customer_id {
        Some(ObjectId::parse_str(cid)
            .map_err(|_| actix_web::error::ErrorBadRequest("Invalid customerId"))?)
    } else {
        None
    };

    let filter = EstimateFilter {
        status: q.status,
        customer_id: customer_oid,
        issue_date_from: q.from,
        issue_date_to: q.to,
        search: q.search,
        page: q.page,
        limit: q.limit,
    };

    let result = service.list_filtered(&org_id, filter).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(PagedResponse {
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
    }))
}

/// GET /api/v1/estimates/{id}
#[get("/estimates/{id}")]
pub async fn get_estimate(
    service: web::Data<EstimateService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id_str = id.into_inner();
    if ObjectId::parse_str(&id_str).is_err() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Invalid estimate id" })));
    }

    match service.get_by_id(&id_str).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) if e.organization_id == Some(org_id) => Ok(HttpResponse::Ok().json(e)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Estimate not found" }))),
    }
}

/// GET /api/v1/estimates/customer/{customer_id}
#[get("/estimates/customer/{customer_id}")]
pub async fn list_estimates_by_customer(
    service: web::Data<EstimateService>,
    customer_id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let cid = ObjectId::parse_str(&customer_id.into_inner())
        .map_err(|_| actix_web::error::ErrorBadRequest("Invalid customer id"))?;

    let estimates = service.get_by_customer(&cid, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(estimates))
}

/// PUT /api/v1/estimates/{id}
#[put("/estimates/{id}")]
pub async fn update_estimate(
    service: web::Data<EstimateService>,
    id: Path<String>,
    body: Json<EstimateRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id_str = id.into_inner();
    if ObjectId::parse_str(&id_str).is_err() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Invalid estimate id" })));
    }

    let existing = service.get_by_id(&id_str).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Estimate not found" })))?;
    if existing.organization_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    if existing.status == EstimateStatus::Converted {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Cannot edit a converted estimate" })));
    }

    let req = body.into_inner();
    if let Some(msg) = validate_estimate(&req) {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": msg })));
    }

    let mut updated: Estimate = req.into();
    // Preserve immutable fields
    updated.organization_id = existing.organization_id;
    updated.organization_details = existing.organization_details;
    updated.created_by = existing.created_by;
    updated.created_at = existing.created_at;
    updated.converted_to_invoice_id = existing.converted_to_invoice_id;

    match service.update(&id_str, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) => Ok(HttpResponse::Ok().json(e)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Estimate not found" }))),
    }
}

/// PUT /api/v1/estimates/{id}/status
#[put("/estimates/{id}/status")]
pub async fn update_estimate_status(
    service: web::Data<EstimateService>,
    id: Path<String>,
    body: Json<serde_json::Value>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id_str = id.into_inner();
    if ObjectId::parse_str(&id_str).is_err() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Invalid estimate id" })));
    }

    let new_status: EstimateStatus = serde_json::from_value(
        body.get("status").cloned().unwrap_or(serde_json::Value::Null),
    )
    .map_err(|_| actix_web::error::ErrorBadRequest("Invalid or missing status value"))?;

    let existing = service.get_by_id(&id_str).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Estimate not found" })))?;
    if existing.organization_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }
    if existing.status == EstimateStatus::Converted {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Cannot change status of a converted estimate" })));
    }

    let mut updated = existing;
    updated.status = new_status;

    match service.update(&id_str, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(e) => Ok(HttpResponse::Ok().json(e)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Estimate not found" }))),
    }
}

/// DELETE /api/v1/estimates/{id}
#[delete("/estimates/{id}")]
pub async fn delete_estimate(
    service: web::Data<EstimateService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    check_permission(&user.permissions, Module::Invoice, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id_str = id.into_inner();
    if ObjectId::parse_str(&id_str).is_err() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Invalid estimate id" })));
    }

    let existing = service.get_by_id(&id_str).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Estimate not found" }))),
        Some(e) if e.organization_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        Some(e) if e.status == EstimateStatus::Converted =>
            return Ok(HttpResponse::BadRequest().json(json!({ "message": "Cannot delete a converted estimate" }))),
        _ => {}
    }

    let deleted = service.delete(&id_str).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Estimate not found" })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_next_estimate_number)
        .service(create_estimate)
        .service(list_estimates)
        .service(list_estimates_by_customer)
        .service(get_estimate)
        .service(update_estimate)
        .service(update_estimate_status)
        .service(delete_estimate);
}
