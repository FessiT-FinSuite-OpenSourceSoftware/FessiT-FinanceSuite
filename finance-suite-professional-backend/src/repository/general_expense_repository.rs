use std::sync::Arc;

use chrono::Utc;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::general_expense::GeneralExpense;

#[derive(Clone)]
pub struct GeneralExpenseRepository {
    collection: Arc<Collection<GeneralExpense>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_general_expense(raw: Document) -> Option<GeneralExpense> {
    let oid = raw.get_object_id("_id").ok();
    let mut expense: GeneralExpense = from_document(raw).ok()?;
    expense.id = oid;
    // Ensure GST fields default to 0.0 for old documents that lack them
    if expense.sub_total == 0.0 && expense.total_cgst == 0.0 && expense.total_sgst == 0.0 && expense.total_igst == 0.0 {
        // sub_total for old docs = amount (no GST was applied)
        if expense.sub_total == 0.0 {
            expense.sub_total = expense.amount;
        }
    }
    Some(expense)
}

impl GeneralExpenseRepository {
    pub fn new(collection: Collection<GeneralExpense>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<GeneralExpense>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_general_expense(raw) {
                list.push(e);
            }
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

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<GeneralExpense>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<GeneralExpense>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_general_expense))
    }

    pub async fn update(&self, id: &str, mut expense: GeneralExpense) -> Result<Option<GeneralExpense>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        expense.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, expense, None).await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(false),
        };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }

    /// Get current month's GST summary for approved general expenses in an organisation
    pub async fn get_monthly_gst_summary(&self, org_id: &ObjectId) -> Result<GeneralExpenseMonthlyGstSummary, MongoError> {
        let expenses = self.get_by_org(org_id).await?;
        let now = Utc::now();
        let current_year = now.format("%Y").to_string();
        let current_month = now.format("%m").to_string();

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

            // Support both YYYY-MM-DD and DD-MM-YYYY
            let (year, month) = if date.chars().nth(4) == Some('-') {
                // YYYY-MM-DD
                (&date[0..4], &date[5..7])
            } else if date.chars().nth(2) == Some('-') {
                // DD-MM-YYYY
                (&date[6..10], &date[3..5])
            } else {
                continue;
            };

            if year != current_year || month != current_month {
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
            month: format!("{}-{}", current_year, current_month),
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
