use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::assets::{Asset, AssetStatus, AssetType, PaymentMode},
    services::asset_service::AssetService,
    utils::auth::Claims,
};

const UPLOAD_DIR: &str = "./uploads/assets";

#[derive(Debug, Deserialize)]
pub struct UpdateAssetStatusRequest {
    pub asset_status: AssetStatus,
}

fn parse_payment_mode(s: Option<&str>) -> PaymentMode {
    match s.unwrap_or("").trim() {
        "cash" => PaymentMode::Cash,
        "bank_transfer" => PaymentMode::BankTransfer,
        "upi" => PaymentMode::Upi,
        "card" => PaymentMode::Card,
        "cheque" => PaymentMode::Cheque,
        "other" => PaymentMode::Other,
        _ => PaymentMode::default(),
    }
}

fn parse_asset_status(s: Option<&str>) -> AssetStatus {
    match s.unwrap_or("").trim() {
        "active" => AssetStatus::Active,
        "repair" => AssetStatus::Repair,
        "obsolete" => AssetStatus::Obsolete,
        "maintenance" => AssetStatus::Maintenance,
        _ => AssetStatus::default(),
    }
}

fn parse_asset_type(s: Option<&str>) -> AssetType {
    match s.unwrap_or("").trim() {
        "rental" => AssetType::Rental,
        "owned" => AssetType::Owned,
        _ => AssetType::default(),
    }
}

fn admin_only(user: &crate::models::users::User) -> actix_web::Result<()> {
    if user.is_admin {
        Ok(())
    } else {
        Err(actix_web::error::ErrorForbidden(
            json!({ "error": "Only admins can manage assets", "code": "ADMIN_ONLY" }).to_string()
        ))
    }
}

async fn collect_multipart(
    mut payload: Multipart,
) -> actix_web::Result<(std::collections::HashMap<String, String>, Option<String>)> {
    use std::fs;
    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut stored_image: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        if field_name == "image" && original_name.is_some() {
            let original = original_name.unwrap();
            let ext = std::path::Path::new(&original).extension()
                .and_then(|e| e.to_str()).unwrap_or("").to_string();
            let stored = if ext.is_empty() {
                format!("{}.bin", Uuid::new_v4())
            } else {
                format!("{}.{}", Uuid::new_v4(), ext)
            };
            let filepath = std::path::Path::new(UPLOAD_DIR).join(&stored);
            let filepath_clone = filepath.clone();
            let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                .await.map_err(actix_web::error::ErrorInternalServerError)??;
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                f = web::block(move || f.write_all(&data).map(|_| f))
                    .await.map_err(actix_web::error::ErrorInternalServerError)??;
            }
            stored_image = Some(stored);
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }
    Ok((fields, stored_image))
}

#[post("/assets")]
pub async fn create_asset(
    service: web::Data<AssetService>,
    payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let (mut fields, stored_image) = collect_multipart(payload).await?;

    let name = fields.remove("name").unwrap_or_default();
    let name = name.trim().to_string();
    if name.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Asset name is required" })));
    }

    let category_str = fields.remove("category").unwrap_or_default();
    let category_str = category_str.trim();
    if category_str.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Category is required" })));
    }
    let category_id = mongodb::bson::oid::ObjectId::parse_str(category_str)
        .map_err(|_| actix_web::error::ErrorBadRequest("Invalid category ID"))?;

    let payment_mode = parse_payment_mode(fields.remove("payment_mode").as_deref());
    let asset_status = parse_asset_status(fields.remove("asset_status").as_deref());

    let asset = Asset {
        id: None,
        image: stored_image.unwrap_or_default(),
        name,
        description: fields.remove("description").unwrap_or_default(),
        hsn: fields.remove("hsn").unwrap_or_default(),
        item_code: fields.remove("item_code").unwrap_or_default(),
        category: category_id,
        manufacturer: fields.remove("manufacturer").unwrap_or_default(),
        vendor: fields.remove("vendor").unwrap_or_default(),
        payment_mode,
        stocks: fields.remove("stocks").and_then(|v| v.parse().ok()).unwrap_or(0.0),
        warranty_period: fields.remove("warranty_period").unwrap_or_default(),
        asset_status,
        sale_price: fields.remove("sale_price").and_then(|v| v.parse().ok()).unwrap_or(0.0),
        purchased_price: fields.remove("purchased_price").and_then(|v| v.parse().ok()).unwrap_or(0.0),
        tax: fields.remove("tax").and_then(|v| v.parse().ok()).unwrap_or(0.0),
        purchased_date: fields.remove("purchased_date").unwrap_or_default(),
        notes: fields.remove("notes").unwrap_or_default(),
        assigned_date: fields.remove("assigned_date").unwrap_or_default(),
        assigned_to: fields.remove("assigned_to").unwrap_or_default(),
        serial_no: fields.remove("serial_no").unwrap_or_default(),
        asset_type: parse_asset_type(fields.remove("asset_type").as_deref()),
        organisation_id: None,
    };

    let saved = service.create(asset, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

#[get("/assets")]
pub async fn list_assets(
    service: web::Data<AssetService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let assets = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(assets))
}

#[get("/assets/{id}")]
pub async fn get_asset(
    service: web::Data<AssetService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    match service.get_by_id(&id.into_inner()).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(a) if a.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(a)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" }))),
    }
}

#[put("/assets/{id}")]
pub async fn update_asset(
    service: web::Data<AssetService>,
    id: Path<String>,
    payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Asset not found" })))?;

    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    let (mut fields, stored_image) = collect_multipart(payload).await?;

    let name = fields.remove("name").map(|s| s.trim().to_string()).unwrap_or_else(|| existing.name.clone());
    if name.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Asset name is required" })));
    }

    let category_id = if let Some(cat_str) = fields.remove("category") {
        let cat_str = cat_str.trim().to_string();
        if cat_str.is_empty() {
            existing.category
        } else {
            mongodb::bson::oid::ObjectId::parse_str(&cat_str)
                .map_err(|_| actix_web::error::ErrorBadRequest("Invalid category ID"))?
        }
    } else {
        existing.category
    };

    let payment_mode = fields.remove("payment_mode")
        .map(|v| parse_payment_mode(Some(&v)))
        .unwrap_or(existing.payment_mode.clone());
    let asset_status = fields.remove("asset_status")
        .map(|v| parse_asset_status(Some(&v)))
        .unwrap_or(existing.asset_status.clone());

    if let Some(ref new_img) = stored_image {
        if !existing.image.is_empty() && existing.image != *new_img {
            let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.image));
        }
    }

    let updated = Asset {
        id: None,
        image: stored_image.unwrap_or(existing.image),
        name,
        description: fields.remove("description").unwrap_or(existing.description),
        hsn: fields.remove("hsn").unwrap_or(existing.hsn),
        item_code: fields.remove("item_code").unwrap_or(existing.item_code),
        category: category_id,
        manufacturer: fields.remove("manufacturer").unwrap_or(existing.manufacturer),
        vendor: fields.remove("vendor").unwrap_or(existing.vendor),
        payment_mode,
        stocks: fields.remove("stocks").and_then(|v| v.parse().ok()).unwrap_or(existing.stocks),
        warranty_period: fields.remove("warranty_period").unwrap_or(existing.warranty_period),
        asset_status,
        sale_price: fields.remove("sale_price").and_then(|v| v.parse().ok()).unwrap_or(existing.sale_price),
        purchased_price: fields.remove("purchased_price").and_then(|v| v.parse().ok()).unwrap_or(existing.purchased_price),
        tax: fields.remove("tax").and_then(|v| v.parse().ok()).unwrap_or(existing.tax),
        purchased_date: fields.remove("purchased_date").unwrap_or(existing.purchased_date),
        notes: fields.remove("notes").unwrap_or(existing.notes),
        assigned_date: fields.remove("assigned_date").unwrap_or(existing.assigned_date),
        assigned_to: fields.remove("assigned_to").unwrap_or(existing.assigned_to),
        serial_no: fields.remove("serial_no").unwrap_or(existing.serial_no),
        asset_type: fields.remove("asset_type")
            .map(|v| parse_asset_type(Some(&v)))
            .unwrap_or(existing.asset_type),
        organisation_id: existing.organisation_id,
    };

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(a) => Ok(HttpResponse::Ok().json(a)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" }))),
    }
}

#[delete("/assets/{id}")]
pub async fn delete_asset(
    service: web::Data<AssetService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" }))),
        Some(a) if a.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }

    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" })))
    }
}

#[put("/assets/{id}/status")]
pub async fn update_asset_status(
    service: web::Data<AssetService>,
    id: Path<String>,
    req: Json<UpdateAssetStatusRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    admin_only(&user)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" }))),
        Some(a) if a.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }

    match service.update_status(&id, &req.asset_status).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(a) => Ok(HttpResponse::Ok().json(a)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Asset not found" }))),
    }
}

#[get("/asset-images/{filename}")]
pub async fn get_asset_image(
    path: Path<String>,
    service: web::Data<AssetService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let filename = path.into_inner();
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(actix_web::error::ErrorBadRequest("Invalid filename"));
    }

    let assets = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !assets.iter().any(|a| a.image == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("Image not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_asset_image)
        .service(create_asset)
        .service(list_assets)
        .service(get_asset)
        .service(update_asset)
        .service(delete_asset)
        .service(update_asset_status);
}
