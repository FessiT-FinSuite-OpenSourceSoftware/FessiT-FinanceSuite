use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::challan::Challan;

#[derive(Clone)]
pub struct ChallanRepository {
    collection: Arc<Collection<Challan>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_challan(raw: Document) -> Option<Challan> {
    let oid = raw.get_object_id("_id").ok();
    let mut challan: Challan = from_document(raw).ok()?;
    challan.id = oid;
    Some(challan)
}

impl ChallanRepository {
    pub fn new(collection: Collection<Challan>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Challan>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(c) = doc_to_challan(raw) {
                list.push(c);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut challan: Challan) -> Result<Challan, MongoError> {
        let result = self.collection.insert_one(&challan, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            challan.id = Some(id);
        }
        Ok(challan)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Challan>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Challan>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_challan))
    }

    pub async fn update(&self, id: &str, mut challan: Challan) -> Result<Option<Challan>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        challan.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, challan, None).await?;
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
