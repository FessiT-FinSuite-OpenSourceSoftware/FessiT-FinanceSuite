use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Data, Path, Query},
    HttpResponse, Responder,
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, io::Write, path::PathBuf};
use uuid::Uuid;

use mongodb::bson::DateTime;

use crate::{
    models::expense::{Expense, ExpenseItem, ExpenseStatus},
    services::expense_service::ExpenseService,
};

/// Directory to store uploaded receipts
const EXPENSE_UPLOAD_DIR: &str = "./uploads/expenses";

/// Query parameters for listing expenses
#[derive(Debug, Deserialize)]
pub struct ExpenseQuery {
    #[serde(default)]
    pub project_cost_center: Option<String>,
    #[serde(default)]
    pub page: Option<u64>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub search: Option<String>,
}

/// Response for paginated expenses
#[derive(Debug, Serialize)]
pub struct ExpenseListResponse {
    pub expenses: Vec<Expense>,
    pub total: u64,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

/// POST /api/v1/expenses
/// multipart/form-data fields:
///   - expenseCategory
///   - projectCostCenter
///   - expenseTitle
///   - expenseDate
///   - currency
///   - amount
///   - comment
///   - receipt (file)
#[post("/expenses")]
pub async fn create_expense(
    service: Data<ExpenseService>,
    mut payload: Multipart,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    use std::path::Path;

    let mut fields: HashMap<String, String> = HashMap::new();
    let mut stored_filename: Option<String> = None;
    let mut original_filename: Option<String> = None;

    // Ensure upload dir exists
    fs::create_dir_all(EXPENSE_UPLOAD_DIR)
        .map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let content_disposition = field.content_disposition();
        let name = content_disposition.get_name().unwrap_or("").to_string();

        if name == "receipt" {
            // Handle file upload
            if let Some(filename) = content_disposition.get_filename() {
                original_filename = Some(filename.to_string());

                let ext = Path::new(filename)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("");

                let unique_name = if ext.is_empty() {
                    format!("{}.bin", Uuid::new_v4())
                } else {
                    format!("{}.{}", Uuid::new_v4(), ext)
                };

                let filepath: PathBuf = Path::new(EXPENSE_UPLOAD_DIR).join(&unique_name);

                // Clone filepath for the closure
                let filepath_clone = filepath.clone();
                let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                    .await
                    .map_err(actix_web::error::ErrorInternalServerError)??;

                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                    f = web::block(move || f.write_all(&data).map(|_| f))
                        .await
                        .map_err(actix_web::error::ErrorInternalServerError)??;
                }

                stored_filename = Some(unique_name);
            }
        } else {
            // Regular text field
            let mut value_bytes = web::BytesMut::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                value_bytes.extend_from_slice(&data);
            }
            let value = String::from_utf8(value_bytes.to_vec()).unwrap_or_default();
            fields.insert(name, value);
        }
    }

    // Parse amount
    let amount: f64 = fields
        .get("amount")
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    // Build a single ExpenseItem
    let item = ExpenseItem {
        expense_category: fields.get("expenseCategory").cloned().unwrap_or_default(),
        currency: fields
            .get("currency")
            .cloned()
            .unwrap_or_else(|| "INR".to_string()),
        amount,
        expense_date: fields.get("expenseDate").cloned().unwrap_or_default(),
        comment: fields.get("comment").cloned().unwrap_or_default(),
        receipt_file: stored_filename.clone(),
        original_filename,
        payment_method: fields.get("paymentMethod").cloned(),
        vendor: fields.get("vendor").cloned(),
        billable: fields
            .get("billable")
            .and_then(|s| s.parse::<bool>().ok())
            .unwrap_or(false),
        tax_amount: fields.get("taxAmount").and_then(|s| s.parse::<f64>().ok()),
    };

    // Build top-level Expense
    let now = DateTime::now();
    let expense = Expense {
        id: None,
        expense_title: fields.get("expenseTitle").cloned().unwrap_or_default(),
        project_cost_center: fields
            .get("projectCostCenter")
            .cloned()
            .unwrap_or_default(),
        items: vec![item],
        total_amount: amount,
        total_tax: fields
            .get("taxAmount")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        status: ExpenseStatus::Draft,
        submitted_by: fields.get("submittedBy").cloned(),
        approved_by: None,
        submitted_at: None,
        reviewed_at: None,
        rejection_reason: None,
        reimbursed_at: None,
        notes: fields.get("notes").cloned(),
        department: fields.get("department").cloned(),
        created_at: Some(now),
        updated_at: Some(now),
    };

    let saved = service
        .create_expense(expense)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(saved))
}

/// GET /api/v1/expenses
#[get("/expenses")]
pub async fn list_expenses(
    service: Data<ExpenseService>,
    query: Query<ExpenseQuery>,
) -> actix_web::Result<impl Responder> {
    // Handle search
    if let Some(search_term) = &query.search {
        let expenses = service
            .search_expenses(search_term)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?;

        return Ok(HttpResponse::Ok().json(ExpenseListResponse {
            expenses,
            total: 0, // For search, we don't compute total
            page: query.page,
            limit: query.limit,
        }));
    }

    // Handle filter by project
    let expenses = if let Some(project) = &query.project_cost_center {
        service
            .get_expenses_by_project(project, query.page, query.limit)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        service
            .get_all_expenses(query.page, query.limit)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    };

    // Get total count for pagination
    let total = if query.project_cost_center.is_some() {
        service
            .count_expenses_by_project(query.project_cost_center.as_ref().unwrap())
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        service
            .count_expenses()
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    };

    Ok(HttpResponse::Ok().json(ExpenseListResponse {
        expenses,
        total,
        page: query.page,
        limit: query.limit,
    }))
}

/// GET /api/v1/expenses/{id}
#[get("/expenses/{id}")]
pub async fn get_expense(
    service: Data<ExpenseService>,
    id: Path<String>,
) -> actix_web::Result<impl Responder> {
    let id = id.into_inner();

    let maybe_expense = service
        .get_expense_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(expense) = maybe_expense {
        Ok(HttpResponse::Ok().json(expense))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Expense not found"
        })))
    }
}

/// PUT /api/v1/expenses/{id}
#[put("/expenses/{id}")]
pub async fn update_expense(
    service: Data<ExpenseService>,
    id: Path<String>,
    mut payload: Multipart,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    use std::path::Path;

    let id = id.into_inner();

    // Verify expense exists
    let existing = service
        .get_expense_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(json!({
            "message": "Expense not found"
        })));
    }

    let mut fields: HashMap<String, String> = HashMap::new();
    let mut stored_filename: Option<String> = None;
    let mut original_filename: Option<String> = None;

    // Ensure upload dir exists
    fs::create_dir_all(EXPENSE_UPLOAD_DIR)
        .map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let content_disposition = field.content_disposition();
        let name = content_disposition.get_name().unwrap_or("").to_string();

        if name == "receipt" {
            // Handle file upload
            if let Some(filename) = content_disposition.get_filename() {
                original_filename = Some(filename.to_string());

                let ext = Path::new(filename)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("");

                let unique_name = if ext.is_empty() {
                    format!("{}.bin", Uuid::new_v4())
                } else {
                    format!("{}.{}", Uuid::new_v4(), ext)
                };

                let filepath: PathBuf = Path::new(EXPENSE_UPLOAD_DIR).join(&unique_name);

                // Clone filepath for the closure
                let filepath_clone = filepath.clone();
                let mut f = web::block(move || std::fs::File::create(&filepath_clone))
                    .await
                    .map_err(actix_web::error::ErrorInternalServerError)??;

                while let Some(chunk) = field.next().await {
                    let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                    f = web::block(move || f.write_all(&data).map(|_| f))
                        .await
                        .map_err(actix_web::error::ErrorInternalServerError)??;
                }

                stored_filename = Some(unique_name);
            }
        } else {
            // Regular text field
            let mut value_bytes = web::BytesMut::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                value_bytes.extend_from_slice(&data);
            }
            let value = String::from_utf8(value_bytes.to_vec()).unwrap_or_default();
            fields.insert(name, value);
        }
    }

    // Parse amount
    let amount: f64 = fields
        .get("amount")
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    // Build a single ExpenseItem
    let item = ExpenseItem {
        expense_category: fields.get("expenseCategory").cloned().unwrap_or_default(),
        currency: fields
            .get("currency")
            .cloned()
            .unwrap_or_else(|| "INR".to_string()),
        amount,
        expense_date: fields.get("expenseDate").cloned().unwrap_or_default(),
        comment: fields.get("comment").cloned().unwrap_or_default(),
        receipt_file: stored_filename.clone(),
        original_filename,
        payment_method: fields.get("paymentMethod").cloned(),
        vendor: fields.get("vendor").cloned(),
        billable: fields
            .get("billable")
            .and_then(|s| s.parse::<bool>().ok())
            .unwrap_or(false),
        tax_amount: fields.get("taxAmount").and_then(|s| s.parse::<f64>().ok()),
    };

    let existing_expense = existing.unwrap();

    // Build updated Expense
    let expense = Expense {
        id: None,
        expense_title: fields.get("expenseTitle").cloned().unwrap_or_default(),
        project_cost_center: fields
            .get("projectCostCenter")
            .cloned()
            .unwrap_or_default(),
        items: vec![item],
        total_amount: amount,
        total_tax: fields
            .get("taxAmount")
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        status: existing_expense.status,
        submitted_by: existing_expense.submitted_by,
        approved_by: existing_expense.approved_by,
        submitted_at: existing_expense.submitted_at,
        reviewed_at: existing_expense.reviewed_at,
        rejection_reason: existing_expense.rejection_reason,
        reimbursed_at: existing_expense.reimbursed_at,
        notes: fields.get("notes").cloned().or(existing_expense.notes),
        department: fields.get("department").cloned().or(existing_expense.department),
        created_at: existing_expense.created_at,
        updated_at: Some(DateTime::now()),
    };

    let updated = service
        .update_expense(&id, expense)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(expense) = updated {
        Ok(HttpResponse::Ok().json(expense))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Expense not found"
        })))
    }
}

/// DELETE /api/v1/expenses/{id}
#[delete("/expenses/{id}")]
pub async fn delete_expense(
    service: Data<ExpenseService>,
    id: Path<String>,
) -> actix_web::Result<impl Responder> {
    use std::path::Path;

    let id = id.into_inner();

    // Get expense first to retrieve receipt filenames
    if let Some(expense) = service
        .get_expense_by_id(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
    {
        // Delete receipt files
        for item in &expense.items {
            if let Some(filename) = &item.receipt_file {
                let filepath = Path::new(EXPENSE_UPLOAD_DIR).join(filename);
                let _ = std::fs::remove_file(filepath); // Ignore errors
            }
        }
    }

    let deleted = service
        .delete_expense(&id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "Expense not found"
        })))
    }
}

/// GET /api/v1/expenses/receipt/{filename}
/// Serves the stored receipt file so UI can preview/download
#[get("/expenses/receipt/{filename}")]
pub async fn get_expense_receipt(path: Path<String>) -> actix_web::Result<NamedFile> {
    use std::path::Path;

    let filename = path.into_inner();
    let filepath = Path::new(EXPENSE_UPLOAD_DIR).join(&filename);

    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }

    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

/// GET /api/v1/expenses/stats/summary
/// Get overall expense statistics
#[get("/expenses/stats/summary")]
pub async fn get_expense_summary(
    service: Data<ExpenseService>,
) -> actix_web::Result<impl Responder> {
    let summary = service
        .get_expense_summary()
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(summary))
}

/// GET /api/v1/expenses/stats/project/{project}
/// Get statistics for a specific project
#[get("/expenses/stats/project/{project}")]
pub async fn get_project_statistics(
    service: Data<ExpenseService>,
    project: Path<String>,
) -> actix_web::Result<impl Responder> {
    let project = project.into_inner();

    let stats = service
        .get_project_statistics(&project)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(stats))
}

/// GET /api/v1/expenses/projects
/// Get all unique project names
#[get("/expenses/projects")]
pub async fn get_all_projects(service: Data<ExpenseService>) -> actix_web::Result<impl Responder> {
    let projects = service
        .get_all_projects()
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(json!({
        "projects": projects
    })))
}

/// Register routes under /api/v1
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(create_expense)
        .service(list_expenses)
        .service(get_expense)
        .service(update_expense)
        .service(delete_expense)
        .service(get_expense_receipt)
        .service(get_expense_summary)
        .service(get_project_statistics)
        .service(get_all_projects);
}