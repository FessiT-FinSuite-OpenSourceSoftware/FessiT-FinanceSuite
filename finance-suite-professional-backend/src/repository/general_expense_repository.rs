use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::{
    general_expense::{GeneralExpense, GeneralExpenseResponse},
    employee::Employee,
};

#[derive(Clone)]
pub struct GeneralExpenseRepository {
    collection: Arc<Collection<GeneralExpense>>,
    raw_collection: Arc<Collection<Document>>,
    employee_collection: Arc<Collection<Document>>,
}

fn doc_to_general_expense(raw: Document) -> Option<GeneralExpense> {
    let oid = raw.get_object_id("_id").ok();
    let mut expense: GeneralExpense = from_document(raw).ok()?;
    expense.id = oid;
    if expense.sub_total == 0.0 {
        expense.sub_total = expense.amount;
    }
    Some(expense)
}

/// Enrich a `GeneralExpense` with the resolved employee name.
/// Falls back to the stored `paid_by` string for legacy records.
fn to_response(expense: GeneralExpense, emp_name: Option<String>) -> GeneralExpenseResponse {
    let paid_by_employee_id = expense.paid_by_employee_id.map(|o| o.to_hex());
    let paid_by = emp_name.unwrap_or_else(|| expense.paid_by.clone());
    GeneralExpenseResponse {
        id: expense.id,
        title: expense.title,
        category: expense.category,
        date: expense.date,
        amount: expense.amount,
        sub_total: expense.sub_total,
        total_cgst: expense.total_cgst,
        total_sgst: expense.total_sgst,
        total_igst: expense.total_igst,
        billed_to: expense.billed_to,
        tax_amount: expense.tax_amount,
        paid_by,
        paid_by_employee_id,
        status: expense.status,
        approved_date: expense.approved_date,
        document: expense.document,
        organisation_id: expense.organisation_id,
        cost_type: expense.cost_type,
    }
}

impl GeneralExpenseRepository {
    pub fn new(
        collection: Collection<GeneralExpense>,
        employee_collection: Collection<Document>,
    ) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
            employee_collection: Arc::new(employee_collection),
        }
    }

    /// Fetch all employees for an org into a fast id→name map.
    async fn employee_name_map(&self, org_id: &ObjectId) -> std::collections::HashMap<ObjectId, String> {
        let mut map = std::collections::HashMap::new();
        let Ok(mut cursor) = self.employee_collection
            .find(doc! { "organisationId": org_id }, None).await
        else { return map; };
        while let Ok(Some(raw)) = cursor.try_next().await {
            let oid = match raw.get_object_id("_id") { Ok(o) => o, Err(_) => continue };
            if let Ok(emp) = from_document::<Employee>(raw) {
                let name = format!("{} {}", emp.first_name, emp.last_name).trim().to_string();
                map.insert(oid, name);
            }
        }
        map
    }

    async fn fetch_raw(&self, filter: impl Into<Option<Document>>) -> Result<Vec<GeneralExpense>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_general_expense(raw) { list.push(e); }
        }
        Ok(list)
    }

    pub async fn create(&self, mut expense: GeneralExpense) -> Result<GeneralExpense, MongoError> {
        let result = self.collection.insert_one(&expense, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            expense.id = Some(id);
        }
        Ok(expense)
    }

    /// Returns expenses enriched with resolved employee names.
    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<GeneralExpenseResponse>, MongoError> {
        let expenses = self.fetch_raw(doc! { "organisationId": org_id }).await?;
        let name_map = self.employee_name_map(org_id).await;
        Ok(expenses.into_iter().map(|e| {
            let emp_name = e.paid_by_employee_id.and_then(|id| name_map.get(&id).cloned());
            to_response(e, emp_name)
        }).collect())
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<GeneralExpense>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_general_expense))
    }

    pub async fn update(&self, id: &str, mut expense: GeneralExpense) -> Result<Option<GeneralExpense>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        expense.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, expense, None).await?;
        if result.matched_count == 0 { return Ok(None); }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(false) };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }

    pub async fn get_monthly_gst_summary(&self, org_id: &ObjectId, year: &str, month: &str) -> Result<GeneralExpenseMonthlyGstSummary, MongoError> {
        // Use fetch_raw so we work with GeneralExpense (not the response type)
        let expenses = self.fetch_raw(doc! { "organisationId": org_id }).await?;

        let mut expense_count = 0u32;
        let mut total_amount = 0.0f64;
        let mut total_tax = 0.0f64;
        let mut total_cgst = 0.0f64;
        let mut total_sgst = 0.0f64;
        let mut total_igst = 0.0f64;

        for expense in &expenses {
            if expense.status != crate::models::general_expense::GeneralExpenseStatus::Approved {
                continue;
            }

            let billed_to_company = expense
                .billed_to
                .as_deref()
                .map(|value| value.trim().eq_ignore_ascii_case("company"))
                .unwrap_or(false);

            if !billed_to_company {
                continue;
            }

            let date = expense.date.trim();
            if date.len() < 7 {
                continue;
            }

            let (item_year, item_month) = if date.chars().nth(4) == Some('-') {
                (&date[0..4], &date[5..7])
            } else if date.chars().nth(2) == Some('-') {
                (&date[6..10], &date[3..5])
            } else {
                continue;
            };

            if item_year != year || item_month != month {
                continue;
            }

            expense_count += 1;
            total_amount += expense.sub_total;
            total_tax += expense.tax_amount.unwrap_or(expense.total_cgst + expense.total_sgst + expense.total_igst);
            total_cgst += expense.total_cgst;
            total_sgst += expense.total_sgst;
            total_igst += expense.total_igst;
        }

        Ok(GeneralExpenseMonthlyGstSummary {
            month: format!("{}-{}", year, month),
            expense_count,
            total_amount,
            total_tax,
            total_cgst,
            total_sgst,
            total_igst,
            total_gst_collected: total_cgst + total_sgst + total_igst,
        })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GeneralExpenseMonthlyGstSummary {
    pub month: String,
    pub expense_count: u32,
    pub total_amount: f64,
    pub total_tax: f64,
    pub total_cgst: f64,
    pub total_sgst: f64,
    pub total_igst: f64,
    pub total_gst_collected: f64,
}
