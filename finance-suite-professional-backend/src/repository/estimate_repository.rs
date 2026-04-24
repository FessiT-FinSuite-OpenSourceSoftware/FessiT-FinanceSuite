use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    options::FindOptions,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::estimate::Estimate;

#[derive(Clone)]
pub struct EstimateRepository {
    collection: Arc<Collection<Estimate>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_estimate(raw: Document) -> Option<Estimate> {
    let oid = raw.get_object_id("_id").ok();
    let mut estimate: Estimate = from_document(raw).ok()?;
    estimate.id = oid;
    Some(estimate)
}

pub struct EstimateFilter {
    pub status: Option<String>,
    pub customer_id: Option<ObjectId>,
    pub issue_date_from: Option<String>,
    pub issue_date_to: Option<String>,
    pub search: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

pub struct EstimateListResult {
    pub data: Vec<Estimate>,
    pub total: u64,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

impl EstimateRepository {
    pub fn new(collection: Collection<Estimate>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    pub async fn create(&self, mut estimate: Estimate) -> Result<Estimate, MongoError> {
        let result = self.collection.insert_one(&estimate, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            estimate.id = Some(id);
        }
        Ok(estimate)
    }

    /// Returns all estimates for an org with no filtering — excludes converted by default.
    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Estimate>, MongoError> {
        let mut cursor = self
            .raw_collection
            .find(doc! { "organizationId": org_id, "status": { "$ne": "converted" } }, None)
            .await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_estimate(raw) {
                list.push(e);
            }
        }
        Ok(list)
    }

    /// Filtered + paginated query. Only called when at least one filter or pagination param is present.
    pub async fn list_filtered(
        &self,
        org_id: &ObjectId,
        f: EstimateFilter,
    ) -> Result<EstimateListResult, MongoError> {
        let mut filter = doc! { "organizationId": org_id };

        if let Some(status) = &f.status {
            // explicit status filter — honour it as-is (including "converted")
            filter.insert("status", status.clone());
        } else {
            // no status filter — exclude converted by default
            filter.insert("status", doc! { "$ne": "converted" });
        }
        if let Some(cid) = &f.customer_id {
            filter.insert("customerId", cid);
        }
        if f.issue_date_from.is_some() || f.issue_date_to.is_some() {
            let mut date_filter = Document::new();
            if let Some(from) = &f.issue_date_from {
                date_filter.insert("$gte", from.clone());
            }
            if let Some(to) = &f.issue_date_to {
                date_filter.insert("$lte", to.clone());
            }
            filter.insert("issueDate", date_filter);
        }
        if let Some(search) = &f.search {
            let escaped = regex::escape(search);
            filter.insert(
                "estimateNumber",
                doc! { "$regex": escaped, "$options": "i" },
            );
        }

        let total = self.raw_collection.count_documents(filter.clone(), None).await?;

        let mut opts = FindOptions::default();
        // Sort newest first by _id (insertion order proxy)
        opts.sort = Some(doc! { "_id": -1 });

        if let Some(limit) = f.limit {
            opts.limit = Some(limit);
            if let Some(page) = f.page {
                let skip = (page.saturating_sub(1)) * (limit as u64);
                opts.skip = Some(skip);
            }
        }

        let mut cursor = self.raw_collection.find(filter, opts).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_estimate(raw) {
                list.push(e);
            }
        }

        Ok(EstimateListResult {
            data: list,
            total,
            page: f.page,
            limit: f.limit,
        })
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Estimate>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_estimate))
    }

    pub async fn get_by_customer(
        &self,
        customer_id: &ObjectId,
        org_id: &ObjectId,
    ) -> Result<Vec<Estimate>, MongoError> {
        let mut cursor = self
            .raw_collection
            .find(doc! { "customerId": customer_id, "organizationId": org_id }, None)
            .await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_estimate(raw) {
                list.push(e);
            }
        }
        Ok(list)
    }

    pub async fn update(&self, id: &str, mut estimate: Estimate) -> Result<Option<Estimate>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        estimate.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, estimate, None).await?;
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
}
