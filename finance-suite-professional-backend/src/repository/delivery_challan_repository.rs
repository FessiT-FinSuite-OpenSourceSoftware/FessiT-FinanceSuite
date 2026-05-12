use std::sync::Arc;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document, Regex},
    error::Error as MongoError,
    options::{FindOptions},
    Collection,
};
use futures::stream::TryStreamExt;
use crate::models::delivery_challan::DeliveryChallan;

#[derive(Clone)]
pub struct DeliveryChallanRepository {
    collection: Arc<Collection<DeliveryChallan>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_challan(raw: Document) -> Option<DeliveryChallan> {
    let oid = raw.get_object_id("_id").ok();
    let mut dc: DeliveryChallan = from_document(raw).ok()?;
    dc.id = oid;
    Some(dc)
}

impl DeliveryChallanRepository {
    pub fn new(collection: Collection<DeliveryChallan>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    pub async fn create(&self, mut dc: DeliveryChallan) -> Result<DeliveryChallan, MongoError> {
        let result = self.collection.insert_one(&dc, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() { dc.id = Some(id); }
        Ok(dc)
    }

    pub async fn get_by_org_paginated(
        &self,
        org_id: &ObjectId,
        page: u64,
        page_size: u64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<(Vec<DeliveryChallan>, u64), MongoError> {
        let mut filter = doc! { "organisationId": org_id };

        if let Some(s) = status.filter(|s| !s.is_empty() && *s != "All") {
            filter.insert("status", s);
        }

        if let Some(q) = search.filter(|s| !s.is_empty()) {
            let regex = Regex { pattern: q.to_string(), options: "i".to_string() };
            filter.insert("$or", mongodb::bson::to_bson(&vec![
                doc! { "challan_no":      { "$regex": regex.clone() } },
                doc! { "consignee_name": { "$regex": regex } },
            ]).unwrap());
        }

        let total = self.raw_collection.count_documents(filter.clone(), None).await?;

        let skip = (page.saturating_sub(1)) * page_size;
        let opts = FindOptions::builder()
            .skip(skip)
            .limit(page_size as i64)
            .sort(doc! { "_id": -1 })
            .build();

        let mut cursor = self.raw_collection.find(filter, opts).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(dc) = doc_to_challan(raw) { list.push(dc); }
        }
        Ok((list, total))
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<DeliveryChallan>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_challan))
    }

    pub async fn update(&self, id: &str, mut dc: DeliveryChallan) -> Result<Option<DeliveryChallan>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        dc.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, dc, None).await?;
        if result.matched_count == 0 { return Ok(None); }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(false) };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }
}
