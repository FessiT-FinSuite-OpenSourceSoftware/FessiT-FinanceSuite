use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::gst_challan::GstChallan;

#[derive(Clone)]
pub struct GstChallanRepository {
    collection: Arc<Collection<GstChallan>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_gst_challan(raw: Document) -> Option<GstChallan> {
    let oid = raw.get_object_id("_id").ok();
    let mut gst_challan: GstChallan = from_document(raw).ok()?;
    gst_challan.id = oid;
    Some(gst_challan)
}

impl GstChallanRepository {
    pub fn new(collection: Collection<GstChallan>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<GstChallan>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(c) = doc_to_gst_challan(raw) {
                list.push(c);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut gst_challan: GstChallan) -> Result<GstChallan, MongoError> {
        let result = self.collection.insert_one(&gst_challan, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            gst_challan.id = Some(id);
        }
        Ok(gst_challan)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<GstChallan>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<GstChallan>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_gst_challan))
    }

    pub async fn update(&self, id: &str, mut gst_challan: GstChallan) -> Result<Option<GstChallan>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        gst_challan.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, gst_challan, None).await?;
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
