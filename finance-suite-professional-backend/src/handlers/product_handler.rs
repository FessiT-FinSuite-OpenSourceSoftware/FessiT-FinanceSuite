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
    services::category_service::CategoryService,
    models::product::Product,
    services::product_service::ProductService,
    utils::auth::Claims,
};
use mongodb::bson::oid::ObjectId;

const UPLOAD_DIR: &str = "./uploads/products";

fn admin_only(user: &crate::models::users::User) -> actix_web::Result<()> {
    if user.is_admin {
        Ok(())
    } else {
        Err(actix_web::error::ErrorForbidden(
            json!({ "error": "Only admins can manage products", "code": "ADMIN_ONLY" }).to_string()
        ))
    }
}

fn parse_f64(fields: &mut std::collections::HashMap<String, String>, key: &str) -> f64 {
    fields.remove(key).unwrap_or_default().parse::<f64>().unwrap_or(0.0)
}

fn parse_object_id_field(
    fields: &mut std::collections::HashMap<String, String>,
    key: &str,
) -> actix_web::Result<ObjectId> {
    let value = fields
        .remove(key)
        .ok_or_else(|| actix_web::error::ErrorBadRequest(format!("{} is required", key)))?;

    ObjectId::parse_str(value.trim())
        .map_err(|_| actix_web::error::ErrorBadRequest(format!("{} must be a valid ObjectId", key)))
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

/// POST /api/v1/products  — admin only, multipart
#[post("/products")]
pub async fn create_product(
    service: web::Data<ProductService>,
    category_service: web::Data<CategoryService>,
    payload: Multipart,
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

    let (mut fields, stored_image) = collect_multipart(payload).await?;
    let category_id = parse_object_id_field(&mut fields, "category")?;
    let category = category_service
        .get_by_id(&category_id.to_hex())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Category not found" })))?;

    if category.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    let product = Product {
        id: None,
        image: stored_image.unwrap_or_default(),
        name: fields.remove("name").unwrap_or_default(),
        description: fields.remove("description").unwrap_or_default(),
        hsn: fields.remove("hsn").unwrap_or_default(),
        item_code: fields.remove("item_code").unwrap_or_default(),
        category: category_id,
        manufacturer: fields.remove("manufacturer").unwrap_or_default(),
        stocks: parse_f64(&mut fields, "stocks"),
        sale_price: parse_f64(&mut fields, "sale_price"),
        discount: parse_f64(&mut fields, "discount"),
        purchased_price: parse_f64(&mut fields, "purchased_price"),
        tax: parse_f64(&mut fields, "tax"),
        organisation_id: None,
    };

    let saved = service.create(product, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

/// GET /api/v1/products  — all org members
#[get("/products")]
pub async fn list_products(
    service: web::Data<ProductService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;
    let products = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Ok().json(products))
}

/// GET /api/v1/products/{id}  — all org members
#[get("/products/{id}")]
pub async fn get_product(
    service: web::Data<ProductService>,
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
        Some(p) if p.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(p)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Product not found" }))),
    }
}

/// PUT /api/v1/products/{id}  — admin only, multipart
#[put("/products/{id}")]
pub async fn update_product(
    service: web::Data<ProductService>,
    category_service: web::Data<CategoryService>,
    id: Path<String>,
    payload: Multipart,
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
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Product not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    let (mut fields, stored_image) = collect_multipart(payload).await?;
    let category = if fields.contains_key("category") {
        let category_id = parse_object_id_field(&mut fields, "category")?;
        let category_doc = category_service
            .get_by_id(&category_id.to_hex())
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
            .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Category not found" })))?;

        if category_doc.organisation_id != Some(org_id) {
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
        }

        category_id
    } else {
        existing.category
    };

    // Delete old image if a new one was uploaded
    if let Some(ref new_img) = stored_image {
        if !existing.image.is_empty() && existing.image != *new_img {
            let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.image));
        }
    }

    let updated = Product {
        id: None,
        image: stored_image.unwrap_or(existing.image),
        name: fields.remove("name").unwrap_or(existing.name),
        description: fields.remove("description").unwrap_or(existing.description),
        hsn: fields.remove("hsn").unwrap_or(existing.hsn),
        item_code: fields.remove("item_code").unwrap_or(existing.item_code),
        category,
        manufacturer: fields.remove("manufacturer").unwrap_or(existing.manufacturer),
        stocks: fields.remove("stocks").map(|v| v.parse().unwrap_or(existing.stocks)).unwrap_or(existing.stocks),
        sale_price: fields.remove("sale_price").map(|v| v.parse().unwrap_or(existing.sale_price)).unwrap_or(existing.sale_price),
        discount: fields.remove("discount").map(|v| v.parse().unwrap_or(existing.discount)).unwrap_or(existing.discount),
        purchased_price: fields.remove("purchased_price").map(|v| v.parse().unwrap_or(existing.purchased_price)).unwrap_or(existing.purchased_price),
        tax: fields.remove("tax").map(|v| v.parse().unwrap_or(existing.tax)).unwrap_or(existing.tax),
        organisation_id: existing.organisation_id,
    };

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(p) => Ok(HttpResponse::Ok().json(p)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Product not found" }))),
    }
}

/// DELETE /api/v1/products/{id}  — admin only
#[delete("/products/{id}")]
pub async fn delete_product(
    service: web::Data<ProductService>,
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
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Product not found" }))),
        Some(p) if p.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        Some(p) => {
            if !p.image.is_empty() {
                let _ = std::fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&p.image));
            }
        }
    }

    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({ "message": "Product not found" })))
    }
}

/// GET /api/v1/product-images/{filename}  — serve product image
#[get("/product-images/{filename}")]
pub async fn get_product_image(
    path: Path<String>,
    service: web::Data<ProductService>,
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
    let products = service.list(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !products.iter().any(|p| p.image == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("Image not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_product_image)
        .service(create_product)
        .service(list_products)
        .service(get_product)
        .service(update_product)
        .service(delete_product);
}
