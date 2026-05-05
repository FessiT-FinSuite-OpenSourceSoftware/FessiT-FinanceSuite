use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    models::asset_category::AssetCategory,
    services::asset_category_service::AssetCategoryService,
    utils::auth::Claims,
};

#[derive(Debug, Deserialize)]
pub struct AssetCategoryBody {
    pub category_name: String,
}

fn admin_only(user: &crate::models::users::User) -> actix_web::Result<()> {
    if user.is_admin {
        Ok(())
    } else {
        Err(actix_web::error::ErrorForbidden(
            json!({ "error": "Only admins can manage asset categories", "code": "ADMIN_ONLY" }).to_string()
        ))
    }
}

#[post("/asset-categories")]
pub async fn create_asset_category(
    service: web::Data<AssetCategoryService>,
    req: Json<AssetCategoryBody>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    if req.category_name.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "category_name is required" })));
    }

    let category = AssetCategory {
        id: None,
        category_name: req.category_name.trim().to_string(),
        organisation_id: None,
    };

    let saved = service.create(category, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

#[get("/asset-categories")]
pub async fn list_asset_categories(
    service: web::Data<AssetCategoryService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let categories = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(categories))
}

#[get("/asset-categories/{id}")]
pub async fn get_asset_category(
    service: web::Data<AssetCategoryService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    match service.get_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(c) if c.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(c)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Asset category not found" }))),
    }
}

#[put("/asset-categories/{id}")]
pub async fn update_asset_category(
    service: web::Data<AssetCategoryService>,
    id: Path<String>,
    req: Json<AssetCategoryBody>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    if req.category_name.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "category_name is required" })));
    }

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Asset category not found" })))?;

    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    let updated = AssetCategory {
        id: None,
        category_name: req.category_name.trim().to_string(),
        organisation_id: existing.organisation_id,
    };

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(c) => Ok(HttpResponse::Ok().json(c)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Asset category not found" }))),
    }
}

#[delete("/asset-categories/{id}")]
pub async fn delete_asset_category(
    service: web::Data<AssetCategoryService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Asset category not found" }))),
        Some(c) if c.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }

    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Asset category not found" })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_asset_category)
        .service(list_asset_categories)
        .service(get_asset_category)
        .service(update_asset_category)
        .service(delete_asset_category);
}
