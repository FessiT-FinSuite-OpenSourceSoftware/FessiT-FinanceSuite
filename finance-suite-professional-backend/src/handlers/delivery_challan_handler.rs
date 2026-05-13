use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::json;
use std::io::Write;
use uuid::Uuid;

use crate::{
    models::delivery_challan::{DeliveryChallan, DeliveryChallanItem, DeliveryChallanStatus},
    services::delivery_challan_service::DeliveryChallanService,
    utils::auth::Claims,
};

const UPLOAD_DIR: &str = "./uploads/delivery_challans";

#[derive(Deserialize)]
pub struct ListQuery {
    page:      Option<u64>,
    page_size: Option<u64>,
    search:    Option<String>,
    status:    Option<String>,
}

fn parse_oid(s: &str) -> Option<mongodb::bson::oid::ObjectId> {
    let s = s.trim();
    if s.is_empty() { return None; }
    mongodb::bson::oid::ObjectId::parse_str(s).ok()
}

async fn save_file(field_name: &str, original: &str, field: &mut actix_multipart::Field) -> actix_web::Result<String> {
    let ext = std::path::Path::new(original).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
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
    let _ = field_name; // suppress unused warning
    Ok(stored)
}

fn dc_from_fields(
    fields: &mut std::collections::HashMap<String, String>,
    existing: Option<&DeliveryChallan>,
    dispatched_copy: Option<String>,
    acknowledged_copy: Option<String>,
) -> DeliveryChallan {
    let ex = existing;

    // Extract all fields first
    let items_json = fields.remove("items").unwrap_or_default();
    let items: Vec<DeliveryChallanItem> = serde_json::from_str(&items_json)
        .unwrap_or_else(|_| ex.map(|e| e.items.clone()).unwrap_or_default());

    let customer_id = fields.remove("customer_id").as_deref().and_then(parse_oid)
        .or_else(|| ex.and_then(|e| e.customer_id));
    let invoice_id = fields.remove("invoice_id").as_deref().and_then(parse_oid)
        .or_else(|| ex.and_then(|e| e.invoice_id));
    let purchase_order_id = fields.remove("purchase_order_id").as_deref().and_then(parse_oid)
        .or_else(|| ex.and_then(|e| e.purchase_order_id));

    let challan_no        = fields.remove("challan_no").unwrap_or_else(|| ex.map(|e| e.challan_no.clone()).unwrap_or_default());
    let challan_date      = fields.remove("challan_date").unwrap_or_else(|| ex.map(|e| e.challan_date.clone()).unwrap_or_default());
    let dispatch_date     = fields.remove("dispatch_date").unwrap_or_else(|| ex.map(|e| e.dispatch_date.clone()).unwrap_or_default());
    let invoice_ref       = fields.remove("invoice_ref").unwrap_or_else(|| ex.map(|e| e.invoice_ref.clone()).unwrap_or_default());
    let po_reference      = fields.remove("po_reference").unwrap_or_else(|| ex.map(|e| e.po_reference.clone()).unwrap_or_default());
    let place_of_supply   = fields.remove("place_of_supply").unwrap_or_else(|| ex.map(|e| e.place_of_supply.clone()).unwrap_or_default());
    let purpose           = fields.remove("purpose").unwrap_or_else(|| ex.map(|e| e.purpose.clone()).unwrap_or_default());
    let consignor_name    = fields.remove("consignor_name").unwrap_or_else(|| ex.map(|e| e.consignor_name.clone()).unwrap_or_default());
    let consignor_address = fields.remove("consignor_address").unwrap_or_else(|| ex.map(|e| e.consignor_address.clone()).unwrap_or_default());
    let consignor_gstin   = fields.remove("consignor_gstin").unwrap_or_else(|| ex.map(|e| e.consignor_gstin.clone()).unwrap_or_default());
    let consignee_name    = fields.remove("consignee_name").unwrap_or_else(|| ex.map(|e| e.consignee_name.clone()).unwrap_or_default());
    let consignee_address = fields.remove("consignee_address").unwrap_or_else(|| ex.map(|e| e.consignee_address.clone()).unwrap_or_default());
    let consignee_gstin   = fields.remove("consignee_gstin").unwrap_or_else(|| ex.map(|e| e.consignee_gstin.clone()).unwrap_or_default());
    let delivery_notes    = fields.remove("delivery_notes").unwrap_or_else(|| ex.map(|e| e.delivery_notes.clone()).unwrap_or_default());
    let status: DeliveryChallanStatus = fields.remove("status")
        .and_then(|s| serde_json::from_value(serde_json::Value::String(s)).ok())
        .unwrap_or_else(|| ex.map(|e| e.status.clone()).unwrap_or_default());
    let returned_date = fields.remove("returned_date").filter(|s| !s.is_empty())
        .or_else(|| ex.and_then(|e| e.returned_date.clone()));
    let return_notes = fields.remove("return_notes").filter(|s| !s.is_empty())
        .or_else(|| ex.and_then(|e| e.return_notes.clone()));

    DeliveryChallan {
        id: None,
        challan_no,
        challan_date,
        dispatch_date,
        invoice_ref,
        po_reference,
        place_of_supply,
        purpose,
        consignor_name,
        consignor_address,
        consignor_gstin,
        consignee_name,
        consignee_address,
        consignee_gstin,
        delivery_notes,
        status,
        returned_date,
        return_notes,
        dispatched_copy:   dispatched_copy.unwrap_or_else(|| ex.map(|e| e.dispatched_copy.clone()).unwrap_or_default()),
        acknowledged_copy: acknowledged_copy.unwrap_or_else(|| ex.map(|e| e.acknowledged_copy.clone()).unwrap_or_default()),
        items,
        customer_id,
        invoice_id,
        purchase_order_id,
        organisation_id: ex.and_then(|e| e.organisation_id),
    }
}

#[post("/delivery-challans")]
pub async fn create_delivery_challan(
    service: web::Data<DeliveryChallanService>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut dispatched_copy: Option<String> = None;
    let mut acknowledged_copy: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };
        if let Some(ref original) = original_name {
            if field_name == "dispatched_copy" {
                dispatched_copy = Some(save_file(&field_name, original, &mut field).await?);
            } else if field_name == "acknowledged_copy" {
                acknowledged_copy = Some(save_file(&field_name, original, &mut field).await?);
            }
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }

    let dc = dc_from_fields(&mut fields, None, dispatched_copy, acknowledged_copy);
    if dc.challan_no.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "message": "Challan number is required" })));
    }
    let saved = service.create(dc, &org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    Ok(HttpResponse::Created().json(saved))
}

#[get("/delivery-challans")]
pub async fn list_delivery_challans(
    service: web::Data<DeliveryChallanService>,
    query: web::Query<ListQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let page      = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let search    = query.search.as_deref();
    let status    = query.status.as_deref();

    let (data, total) = service.list_paginated(&org_id, page, page_size, search, status).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(json!({
        "data":      data,
        "total":     total,
        "page":      page,
        "page_size": page_size,
    })))
}

#[get("/delivery-challans/{id}")]
pub async fn get_delivery_challan(
    service: web::Data<DeliveryChallanService>,
    id: web::Path<String>,
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
        Some(dc) if dc.organisation_id == Some(org_id) => Ok(HttpResponse::Ok().json(dc)),
        _ => Ok(HttpResponse::NotFound().json(json!({ "message": "Delivery challan not found" }))),
    }
}

#[put("/delivery-challans/{id}")]
pub async fn update_delivery_challan(
    service: web::Data<DeliveryChallanService>,
    id: web::Path<String>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound(json!({ "message": "Delivery challan not found" })))?;
    if existing.organisation_id != Some(org_id) {
        return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" })));
    }

    fs::create_dir_all(UPLOAD_DIR).map_err(actix_web::error::ErrorInternalServerError)?;

    let mut fields: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut new_dispatched: Option<String> = None;
    let mut new_acknowledged: Option<String> = None;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (field_name, original_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };
        if let Some(ref original) = original_name {
            if field_name == "dispatched_copy" {
                if !existing.dispatched_copy.is_empty() {
                    let _ = fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.dispatched_copy));
                }
                new_dispatched = Some(save_file(&field_name, original, &mut field).await?);
            } else if field_name == "acknowledged_copy" {
                if !existing.acknowledged_copy.is_empty() {
                    let _ = fs::remove_file(std::path::Path::new(UPLOAD_DIR).join(&existing.acknowledged_copy));
                }
                new_acknowledged = Some(save_file(&field_name, original, &mut field).await?);
            }
        } else {
            let mut bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                bytes.extend_from_slice(&data);
            }
            fields.insert(field_name, String::from_utf8(bytes).unwrap_or_default());
        }
    }

    let mut updated = dc_from_fields(&mut fields, Some(&existing), new_dispatched, new_acknowledged);
    updated.organisation_id = existing.organisation_id;

    match service.update(&id, updated).await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        Some(dc) => Ok(HttpResponse::Ok().json(dc)),
        None => Ok(HttpResponse::NotFound().json(json!({ "message": "Delivery challan not found" }))),
    }
}

#[delete("/delivery-challans/{id}")]
pub async fn delete_delivery_challan(
    service: web::Data<DeliveryChallanService>,
    id: web::Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let id = id.into_inner();
    let existing = service.get_by_id(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    match existing {
        None => return Ok(HttpResponse::NotFound().json(json!({ "message": "Delivery challan not found" }))),
        Some(dc) if dc.organisation_id != Some(org_id) =>
            return Ok(HttpResponse::Forbidden().json(json!({ "message": "Access denied" }))),
        _ => {}
    }
    let deleted = service.delete(&id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if deleted { Ok(HttpResponse::NoContent().finish()) }
    else { Ok(HttpResponse::NotFound().json(json!({ "message": "Delivery challan not found" }))) }
}

#[get("/delivery-challan-files/{filename}")]
pub async fn get_delivery_challan_file(
    path: web::Path<String>,
    service: web::Data<DeliveryChallanService>,
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
    // Verify file belongs to this org by checking the challan
    let (challans, _) = service.list_paginated(&org_id, 1, 1000, None, None).await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    if !challans.iter().any(|c| c.dispatched_copy == filename || c.acknowledged_copy == filename) {
        return Err(actix_web::error::ErrorForbidden("Access denied"));
    }
    let filepath = std::path::Path::new(UPLOAD_DIR).join(&filename);
    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }
    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_delivery_challan_file)
        .service(create_delivery_challan)
        .service(list_delivery_challans)
        .service(get_delivery_challan)
        .service(update_delivery_challan)
        .service(delete_delivery_challan);
}
