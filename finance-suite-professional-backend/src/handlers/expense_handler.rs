use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, post, put,
    web::{self, Data, Path, Query},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, io::Write, path::PathBuf};
use uuid::Uuid;

use mongodb::bson::DateTime;

use crate::{
    models::expense::{CostType, Expense, ExpenseItem, ExpenseStatus},
    services::expense_service::ExpenseService,
    utils::auth::Claims,
    utils::permissions::{check_permission, Module, PermissionAction, create_permission_error},
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

/// POST /expenses
/// multipart/form-data fields:
///   - expenseTitle
///   - projectCostCenter
///   - expenseDate
///   - currency
///   - notes
///   - items (JSON string array of expense items)
///   - receipt_0, receipt_1, etc. (files for each item)
#[post("")]
pub async fn create_expense(
    service: Data<ExpenseService>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    use std::path::Path;

    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get user permissions
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Check write permission for expenses
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    // Get user's organisation_id
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let mut fields: HashMap<String, String> = HashMap::new();
    let mut receipt_files: HashMap<String, (String, String)> = HashMap::new(); // index -> (stored_name, original_name)

    // Ensure upload dir exists
    fs::create_dir_all(EXPENSE_UPLOAD_DIR)
        .map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (name, file_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        // Handle receipt files (receipt_0, receipt_1, etc.)
        if name.starts_with("receipt_") {
            if let Some(filename) = file_name {
                let original_filename = filename.clone();

                let ext = Path::new(&filename)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_string();

                let unique_name = if ext.is_empty() {
                    format!("{}.bin", Uuid::new_v4())
                } else {
                    format!("{}.{}", Uuid::new_v4(), ext)
                };

                let filepath: PathBuf = Path::new(EXPENSE_UPLOAD_DIR).join(&unique_name);

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

                // Extract index from field name (receipt_0 -> 0)
                let index = name.replace("receipt_", "");
                receipt_files.insert(index, (unique_name, original_filename));
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

    // Parse items from JSON string
    let items_json = fields.get("items").ok_or_else(|| {
        actix_web::error::ErrorBadRequest("Missing 'items' field")
    })?;

    print!("the things we received from the frontend {items_json}");

    let items_array: Vec<serde_json::Value> = serde_json::from_str(items_json)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid items JSON: {}", e)))?;

    // Build ExpenseItems with receipt files
    let expense_items: Vec<ExpenseItem> = items_array
        .iter()
        .enumerate()
        .map(|(idx, item)| {
            let receipt_info = receipt_files.get(&idx.to_string());

            let amount = item["amount"].as_f64()
                .or_else(|| item["amount"].as_str().and_then(|s| s.parse().ok()))
                .unwrap_or(0.0);
            let total_cgst = item.get("totalCgst").and_then(|v| v.as_f64())
                .or_else(|| item.get("totalCgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                .unwrap_or(0.0);
            let total_sgst = item.get("totalSgst").and_then(|v| v.as_f64())
                .or_else(|| item.get("totalSgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                .unwrap_or(0.0);
            let total_igst = item.get("totalIgst").and_then(|v| v.as_f64())
                .or_else(|| item.get("totalIgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                .unwrap_or(0.0);
            let tax_amount = total_cgst + total_sgst + total_igst;
            let sub_total = amount + tax_amount;

            ExpenseItem {
                expense_category: item["expenseCategory"].as_str().unwrap_or("").to_string(),
                currency: fields.get("currency").cloned().unwrap_or_else(|| "INR".to_string()),
                amount,
                expense_date: item.get("expenseDate").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                comment: item["comment"].as_str().unwrap_or("").to_string(),
                receipt_file: receipt_info.as_ref().map(|(stored, _)| stored.clone()),
                original_filename: receipt_info.as_ref().map(|(_, orig)| orig.clone()),
                payment_method: item.get("paymentMethod").and_then(|v| v.as_str()).map(|s| s.to_string()),
                vendor: item.get("vendor").and_then(|v| v.as_str()).map(|s| s.to_string()),
                billable: item.get("billable").and_then(|v| v.as_bool()).unwrap_or(false),
                tax_amount: Some(tax_amount),
                sub_total,
                total_cgst,
                total_sgst,
                total_igst,
                billed_to: item.get("billedTo").and_then(|v| v.as_str()).map(|s| s.to_string()),
            }
        })
        .collect();

    // Calculate report-level totals
    let base_amount: f64 = expense_items.iter().map(|item| item.amount).sum();
    let total_tax: f64 = expense_items.iter().map(|item| {
        item.total_cgst + item.total_sgst + item.total_igst
    }).sum();
    let total_amount: f64 = expense_items.iter().map(|item| item.sub_total).sum();

    // Build top-level Expense
    let now = DateTime::now();
    let expense = Expense {
        id: None,
        expense_title: fields.get("expenseTitle").cloned().unwrap_or_default(),
        project_cost_center: fields
            .get("projectCostCenter")
            .cloned()
            .unwrap_or_default(),
        items: expense_items,
        base_amount,
        total_amount,
        total_tax,
        status: ExpenseStatus::Submitted,
        submitted_by: fields.get("submittedBy").cloned(),
        approved_by: None,
        submitted_at: None,
        reviewed_at: None,
        rejection_reason: None,
        reimbursed_at: None,
        notes: fields.get("notes").cloned(),
        department: fields.get("department").cloned(),
        submission_date: fields.get("submissionDate").cloned(),
        created_at: Some(now),
        updated_at: Some(now),
        organisation_id: Some(org_id),
        cost_type: fields.get("costType").and_then(|v| match v.to_lowercase().as_str() {
            "direct" => Some(CostType::Direct),
            _ => Some(CostType::Indirect),
        }).unwrap_or_default(),
    };

    let saved = service
        .create_expense(expense)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(saved))
}

/// GET /expenses
#[get("")]
pub async fn list_expenses(
    service: Data<ExpenseService>,
    query: Query<ExpenseQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    log::info!("📥 Received request to list expenses");
    
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| {
            log::error!("❌ Missing JWT claims");
            actix_web::error::ErrorUnauthorized("Missing claims")
        })?;

    log::info!("📋 Fetching expenses for user: {}", claims.email);

    // Get user permissions
    let user = service
        .get_user_permissions(&claims.sub)
        .await
        .map_err(|e| {
            log::error!("❌ Error fetching user: {}", e);
            actix_web::error::ErrorInternalServerError(e)
        })?
        .ok_or_else(|| {
            log::error!("❌ User not found for id: {}", claims.sub);
            actix_web::error::ErrorUnauthorized("User not found")
        })?;

    log::info!("👤 User found: {}, Organisation ID: {:?}", user.email, user.organisation_id);
    log::info!("🔐 User permissions: expenses.read={}, expenses.write={}, expenses.delete={}", 
        user.permissions.expenses.read, 
        user.permissions.expenses.write, 
        user.permissions.expenses.delete
    );

    // Check read permission for expenses
    if let Err(e) = check_permission(&user.permissions, Module::Expenses, PermissionAction::Read, user.is_admin) {
        log::error!("❌ Permission denied: {}", e);
        return Err(actix_web::error::ErrorForbidden(create_permission_error(&e)));
    }

    log::info!("✅ Permission check passed");

    // Get user's organisation_id
    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    log::info!("🔍 Fetching expenses for organisation ID: {}", org_id);

    // Handle search
    if let Some(search_term) = &query.search {
        let expenses = service
            .search_expenses_by_organisation(&org_id, search_term)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?;

        return Ok(HttpResponse::Ok().json(ExpenseListResponse {
            expenses,
            total: 0,
            page: query.page,
            limit: query.limit,
        }));
    }

    // Handle filter by project
    let expenses = if let Some(project) = &query.project_cost_center {
        service
            .get_expenses_by_project_and_organisation(&org_id, project, query.page, query.limit)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        service
            .get_expenses_by_organisation(&org_id, query.page, query.limit)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    };

    // Get total count for pagination
    let total = if query.project_cost_center.is_some() {
        service
            .count_expenses_by_project_and_organisation(&org_id, query.project_cost_center.as_ref().unwrap())
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        service
            .count_expenses_by_organisation(&org_id)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?
    };

    log::info!("✅ Returning {} expenses", expenses.len());

    Ok(HttpResponse::Ok().json(ExpenseListResponse {
        expenses,
        total,
        page: query.page,
        limit: query.limit,
    }))
}

/// GET /expenses/{id}
#[get("/{id}")]
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

/// PUT /expenses/{id}
#[put("/{id}")]
pub async fn update_expense(
    service: Data<ExpenseService>,
    id: Path<String>,
    mut payload: Multipart,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    use std::fs;
    use std::path::Path;

    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;
    let user = service.get_user_permissions(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;
    check_permission(&user.permissions, Module::Expenses, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

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

    // Only admins can modify a Reimbursed expense
    let existing_expense = existing.unwrap();
    if existing_expense.status == ExpenseStatus::Reimbursed && !user.is_admin {
        return Ok(HttpResponse::Forbidden().json(json!({
            "message": "Only admins can modify a Reimbursed expense"
        })));
    }

    let mut fields: HashMap<String, String> = HashMap::new();
    let mut receipt_files: HashMap<String, (String, String)> = HashMap::new();

    // Ensure upload dir exists
    fs::create_dir_all(EXPENSE_UPLOAD_DIR)
        .map_err(actix_web::error::ErrorInternalServerError)?;

    while let Some(field) = payload.next().await {
        let mut field = field.map_err(actix_web::error::ErrorInternalServerError)?;
        let (name, file_name) = {
            let cd = field.content_disposition();
            (cd.get_name().unwrap_or("").to_string(), cd.get_filename().map(|s| s.to_string()))
        };

        if name.starts_with("receipt_") {
            if let Some(filename) = file_name {
                let original_filename = filename.clone();

                let ext = Path::new(&filename)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_string();

                let unique_name = if ext.is_empty() {
                    format!("{}.bin", Uuid::new_v4())
                } else {
                    format!("{}.{}", Uuid::new_v4(), ext)
                };

                let filepath: PathBuf = Path::new(EXPENSE_UPLOAD_DIR).join(&unique_name);

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

                let index = name.replace("receipt_", "");
                receipt_files.insert(index, (unique_name, original_filename));
            }
        } else {
            let mut value_bytes = web::BytesMut::new();
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(actix_web::error::ErrorInternalServerError)?;
                value_bytes.extend_from_slice(&data);
            }
            let value = String::from_utf8(value_bytes.to_vec()).unwrap_or_default();
            fields.insert(name, value);
        }
    }

    // Parse items from JSON if provided, otherwise keep existing items
    let expense_items = if let Some(items_json) = fields.get("items") {
        let items_array: Vec<serde_json::Value> = serde_json::from_str(items_json)
            .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid items JSON: {}", e)))?;

        items_array
            .iter()
            .enumerate()
            .map(|(idx, item)| {
                let receipt_info = receipt_files.get(&idx.to_string());
                
                // If no new receipt uploaded, try to keep existing receipt
                let (receipt_file, original_filename) = if let Some((stored, orig)) = receipt_info {
                    (Some(stored.clone()), Some(orig.clone()))
                } else if let Some(existing_item) = existing_expense.items.get(idx) {
                    (existing_item.receipt_file.clone(), existing_item.original_filename.clone())
                } else {
                    (None, None)
                };

                let amount = item["amount"].as_f64()
                    .or_else(|| item["amount"].as_str().and_then(|s| s.parse().ok()))
                    .unwrap_or(0.0);
                let total_cgst = item.get("totalCgst").and_then(|v| v.as_f64())
                    .or_else(|| item.get("totalCgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                    .unwrap_or(0.0);
                let total_sgst = item.get("totalSgst").and_then(|v| v.as_f64())
                    .or_else(|| item.get("totalSgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                    .unwrap_or(0.0);
                let total_igst = item.get("totalIgst").and_then(|v| v.as_f64())
                    .or_else(|| item.get("totalIgst").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                    .unwrap_or(0.0);
                let tax_amount = total_cgst + total_sgst + total_igst;
                let sub_total = amount + tax_amount;

                ExpenseItem {
                    expense_category: item["expenseCategory"].as_str().unwrap_or("").to_string(),
                    currency: fields.get("currency").cloned().unwrap_or_else(|| "INR".to_string()),
                    amount,
                    expense_date: item.get("expenseDate").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    comment: item["comment"].as_str().unwrap_or("").to_string(),
                    receipt_file,
                    original_filename,
                    payment_method: item.get("paymentMethod").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    vendor: item.get("vendor").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    billable: item.get("billable").and_then(|v| v.as_bool()).unwrap_or(false),
                    tax_amount: Some(tax_amount),
                    sub_total,
                    total_cgst,
                    total_sgst,
                    total_igst,
                    billed_to: item.get("billedTo").and_then(|v| v.as_str()).map(|s| s.to_string()),
                }
            })
            .collect()
    } else {
        existing_expense.items.clone()
    };

    // Calculate report-level totals
    let base_amount: f64 = expense_items.iter().map(|item| item.amount).sum();
    let total_tax: f64 = expense_items.iter().map(|item| {
        item.total_cgst + item.total_sgst + item.total_igst
    }).sum();
    let total_amount: f64 = expense_items.iter().map(|item| item.sub_total).sum();

    // Build updated Expense — use incoming status if provided, else keep existing
    let new_status = if let Some(s) = fields.get("status") {
        serde_json::from_value::<ExpenseStatus>(serde_json::Value::String(s.clone()))
            .unwrap_or(existing_expense.status.clone())
    } else {
        existing_expense.status.clone()
    };

    // Build updated Expense
    let expense = Expense {
        id: None,
        expense_title: fields.get("expenseTitle").cloned().unwrap_or(existing_expense.expense_title),
        project_cost_center: fields.get("projectCostCenter").cloned().unwrap_or(existing_expense.project_cost_center),
        items: expense_items,
        base_amount,
        total_amount,
        total_tax,
        status: new_status.clone(),
        submitted_by: existing_expense.submitted_by,
        approved_by: existing_expense.approved_by,
        submitted_at: existing_expense.submitted_at,
        reviewed_at: existing_expense.reviewed_at,
        rejection_reason: existing_expense.rejection_reason,
        reimbursed_at: if new_status == ExpenseStatus::Reimbursed {
            fields.get("reimbursedAt").cloned().or(existing_expense.reimbursed_at)
        } else {
            existing_expense.reimbursed_at
        },
        notes: fields.get("notes").cloned().or(existing_expense.notes),
        department: fields.get("department").cloned().or(existing_expense.department),
        submission_date: fields.get("submissionDate").cloned().or(existing_expense.submission_date),
        created_at: existing_expense.created_at,
        updated_at: Some(DateTime::now()),
        organisation_id: existing_expense.organisation_id,
        cost_type: fields.get("costType").and_then(|v| match v.to_lowercase().as_str() {
            "direct" => Some(CostType::Direct),
            _ => Some(CostType::Indirect),
        }).unwrap_or(existing_expense.cost_type),
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

/// DELETE /expenses/{id}
#[delete("/{id}")]
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

/// GET /expenses/receipt/{filename}
/// Serves the stored receipt file so UI can preview/download
#[get("/receipt/{filename}")]
pub async fn get_expense_receipt(path: Path<String>) -> actix_web::Result<NamedFile> {
    use std::path::Path;

    let filename = path.into_inner();
    let filepath = Path::new(EXPENSE_UPLOAD_DIR).join(&filename);

    if !filepath.exists() {
        return Err(actix_web::error::ErrorNotFound("File not found"));
    }

    Ok(NamedFile::open(filepath).map_err(actix_web::error::ErrorInternalServerError)?)
}

/// GET /expenses/stats/summary
/// Get overall expense statistics
#[get("/stats/summary")]
pub async fn get_expense_summary(
    service: Data<ExpenseService>,
) -> actix_web::Result<impl Responder> {
    let summary = service
        .get_expense_summary()
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(summary))
}

/// GET /expenses/stats/project/{project}
/// Get statistics for a specific project
#[get("/stats/project/{project}")]
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

/// GET /expenses/projects
/// Get all unique project names
#[get("/projects")]
pub async fn get_all_projects(service: Data<ExpenseService>) -> actix_web::Result<impl Responder> {
    let projects = service
        .get_all_projects()
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

   Ok(HttpResponse::Ok().json(projects)) 
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/expenses")
            .service(create_expense)
            .service(list_expenses)
            .service(get_expense_receipt)
            .service(get_expense_summary)
            .service(get_project_statistics)
            .service(get_all_projects)
            .service(get_expense)
            .service(update_expense)
            .service(delete_expense),
    );
}
