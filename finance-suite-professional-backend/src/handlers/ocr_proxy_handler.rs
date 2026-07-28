use actix_multipart::Multipart;
use actix_web::{post, web, HttpRequest, HttpResponse, Responder};
use futures::StreamExt;
use reqwest::multipart::{Form, Part};

/// Read the OCR service base URL once from the environment.
/// Panics at startup if the variable is missing — fail fast is better than
/// silently proxying to the wrong host.
fn ocr_base_url() -> String {
    std::env::var("OCR_SERVICE_URL")
        .expect("OCR_SERVICE_URL must be set in the environment")
        .trim_end_matches('/')
        .to_string()
}

/// Collect every multipart field into memory so we can forward them to the
/// Python service via reqwest.  We intentionally do NOT write anything to disk.
async fn collect_multipart(mut payload: Multipart) -> actix_web::Result<Vec<(String, Vec<u8>, Option<String>)>> {
    let mut parts: Vec<(String, Vec<u8>, Option<String>)> = Vec::new();

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorBadRequest)?;
        let cd = field.content_disposition();
        let name = cd.get_name().unwrap_or("file").to_string();
        let filename = cd.get_filename().map(|s| s.to_string());

        let mut bytes = Vec::new();
        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(actix_web::error::ErrorBadRequest)?;
            bytes.extend_from_slice(&data);
        }
        parts.push((name, bytes, filename));
    }
    Ok(parts)
}

/// POST /api/v1/ocr/bank-statement/stream
///
/// Receives multipart/form-data from the frontend (file + optional password),
/// forwards it to the Python OCR service, and streams the NDJSON response
/// back verbatim.  HTTP status codes from the Python service are preserved.
#[post("/ocr/bank-statement/stream")]
pub async fn proxy_bank_statement_stream(
    payload: Multipart,
    _req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let base = ocr_base_url();
    let target = format!("{}/ocr/bank-statement/stream", base);

    let parts = collect_multipart(payload).await?;
    if parts.is_empty() {
        return Ok(HttpResponse::BadRequest().json(
            serde_json::json!({ "detail": "No file uploaded" })
        ));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut form = Form::new();
    for (name, bytes, filename) in parts {
        let mut part = Part::bytes(bytes);
        if let Some(fname) = filename {
            part = part.file_name(fname);
        }
        form = form.part(name, part);
    }

    let upstream = client
        .post(&target)
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            log::error!("[OCR proxy] Failed to reach OCR service at {}: {}", target, e);
            actix_web::error::ErrorBadGateway(
                serde_json::json!({ "detail": "OCR service is not reachable" }).to_string()
            )
        })?;

    let status = actix_web::http::StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);

    // For non-2xx responses from the Python service, forward the body as-is
    // so the frontend receives the same error detail it would have before.
    if !status.is_success() {
        let body = upstream.bytes().await.unwrap_or_default();
        return Ok(HttpResponse::build(status).body(body));
    }

    // Stream the NDJSON body back to the frontend without buffering.
    let stream = upstream.bytes_stream().map(|chunk| {
        chunk.map_err(|e| {
            log::error!("[OCR proxy] Stream read error: {}", e);
            actix_web::error::ErrorInternalServerError("Stream interrupted")
        })
    });

    Ok(HttpResponse::Ok()
        .content_type("application/x-ndjson")
        .streaming(stream))
}

/// POST /api/v1/ocr/debug
///
/// Forwards a single file to the Python OCR debug endpoint and returns the
/// raw OCR text response.  Used by the "Raw OCR view" in the Transactions UI.
#[post("/ocr/debug")]
pub async fn proxy_ocr_debug(
    payload: Multipart,
    _req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let base = ocr_base_url();
    let target = format!("{}/ocr/debug", base);

    let parts = collect_multipart(payload).await?;
    if parts.is_empty() {
        return Ok(HttpResponse::BadRequest().json(
            serde_json::json!({ "detail": "No file uploaded" })
        ));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut form = Form::new();
    for (name, bytes, filename) in parts {
        let mut part = Part::bytes(bytes);
        if let Some(fname) = filename {
            part = part.file_name(fname);
        }
        form = form.part(name, part);
    }

    let upstream = client
        .post(&target)
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            log::error!("[OCR proxy] Failed to reach OCR debug endpoint at {}: {}", target, e);
            actix_web::error::ErrorBadGateway(
                serde_json::json!({ "detail": "OCR service is not reachable" }).to_string()
            )
        })?;

    let status = actix_web::http::StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);

    let body = upstream.bytes().await.unwrap_or_default();
    Ok(HttpResponse::build(status)
        .content_type("application/json")
        .body(body))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(proxy_bank_statement_stream)
        .service(proxy_ocr_debug);
}
