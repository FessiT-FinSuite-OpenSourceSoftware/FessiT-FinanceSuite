use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::salary::Salary;

#[derive(Clone)]
pub struct SalaryRepository {
    collection: Arc<Collection<Salary>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_salary(raw: Document) -> Option<Salary> {
    let oid = raw.get_object_id("_id").ok();
    match from_document::<Salary>(raw) {
        Ok(mut salary) => { salary.id = oid; Some(salary) }
        Err(e) => { log::warn!("[Salary] deserialization failed for {:?}: {}", oid, e); None }
    }
}

impl SalaryRepository {
    pub fn new(collection: Collection<Salary>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Salary>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut salaries = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(s) = doc_to_salary(raw) {
                salaries.push(s);
            }
        }
        Ok(salaries)
    }

    pub async fn create(&self, mut salary: Salary) -> Result<Salary, MongoError> {
        let result = self.collection.insert_one(&salary, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            salary.id = Some(id);
        }
        Ok(salary)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Salary>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Salary>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_salary))
    }

    pub async fn update(&self, id: &str, mut salary: Salary) -> Result<Option<Salary>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        salary.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, salary, None).await?;
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

    pub async fn get_monthly_tds_summary(&self, org_id: &ObjectId, year: &str, month: &str) -> Result<SalaryTdsSummary, MongoError> {
        let salaries = self.get_by_org(org_id).await?;

        let mut salary_count       = 0u32;
        let mut total_tds_deducted = 0.0f64;

        for sal in &salaries {
            if sal.status != crate::models::salary::SalaryStatus::Paid { continue; }
            let tds = sal.tds.parse::<f64>().unwrap_or(0.0);
            if tds <= 0.0 { continue; }
            let period = sal.period.trim();
            if period.len() < 7 { continue; }
            if &period[0..4] != year || &period[5..7] != month { continue; }

            salary_count       += 1;
            total_tds_deducted += tds;
        }

        Ok(SalaryTdsSummary {
            month: format!("{}-{}", year, month),
            salary_count,
            total_tds_deducted,
            tds_on_paid: total_tds_deducted,
            tds_pending: 0.0,
        })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SalaryTdsSummary {
    pub month: String,
    /// Number of Paid salary records with TDS > 0 in the current month
    pub salary_count: u32,
    /// Sum of tds from Paid salaries this month
    pub total_tds_deducted: f64,
    pub tds_on_paid: f64,
    pub tds_pending: f64,
}
