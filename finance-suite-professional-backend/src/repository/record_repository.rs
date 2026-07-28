use std::sync::Arc;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;
use crate::models::record::Record;

#[derive(Clone)]
pub struct RecordRepository {
    collection: Arc<Collection<Record>>,
    raw: Arc<Collection<Document>>,
}

fn from_doc(raw: Document) -> Option<Record> {
    let oid = raw.get_object_id("_id").ok();
    let mut r: Record = from_document(raw).ok()?;
    r.id = oid;
    Some(r)
}

impl RecordRepository {
    pub fn new(col: Collection<Record>) -> Self {
        let raw = col.clone_with_type::<Document>();
        Self { collection: Arc::new(col), raw: Arc::new(raw) }
    }

    pub async fn find_by_title(&self, org_id: &ObjectId, title: &str) -> Result<Option<Record>, MongoError> {
        let raw = self.raw.find_one(doc! { "organisationId": org_id, "title": title }, None).await?;
        Ok(raw.and_then(from_doc))
    }

    pub async fn insert(&self, mut record: Record) -> Result<Record, MongoError> {
        let result = self.collection.insert_one(&record, None).await?;
        record.id = result.inserted_id.as_object_id();
        Ok(record)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Record>, MongoError> {
        let mut cursor = self.raw.find(doc! { "organisationId": org_id }, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await? {
            if let Some(r) = from_doc(raw) { list.push(r); }
        }
        Ok(list)
    }

    pub async fn get_by_id(&self, id: &ObjectId) -> Result<Option<Record>, MongoError> {
        let raw = self.raw.find_one(doc! { "_id": id }, None).await?;
        Ok(raw.and_then(from_doc))
    }

    pub async fn update_status(&self, id: &ObjectId, status: &str) -> Result<bool, MongoError> {
        let res = self.raw.update_one(
            doc! { "_id": id },
            doc! { "$set": { "status": status } },
            None,
        ).await?;
        Ok(res.matched_count > 0)
    }

    pub async fn update_notes(&self, id: &ObjectId, notes: &str) -> Result<bool, MongoError> {
        let res = self.raw.update_one(
            doc! { "_id": id },
            doc! { "$set": { "notes": notes } },
            None,
        ).await?;
        Ok(res.matched_count > 0)
    }

    pub async fn delete(&self, id: &ObjectId) -> Result<bool, MongoError> {
        let res = self.collection.delete_one(doc! { "_id": id }, None).await?;
        Ok(res.deleted_count > 0)
    }
}
