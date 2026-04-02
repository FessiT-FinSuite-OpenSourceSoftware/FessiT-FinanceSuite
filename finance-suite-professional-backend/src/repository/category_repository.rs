use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::category::Category;

#[derive(Clone)]
pub struct CategoryRepository {
    collection: Arc<Collection<Category>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_category(raw: Document) -> Option<Category> {
    let oid = raw.get_object_id("_id").ok();
    let mut cat: Category = from_document(raw).ok()?;
    cat.id = oid;
    Some(cat)
}

impl CategoryRepository {
    pub fn new(collection: Collection<Category>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Category>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(c) = doc_to_category(raw) {
                list.push(c);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut category: Category) -> Result<Category, MongoError> {
        let result = self.collection.insert_one(&category, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            category.id = Some(id);
        }
        Ok(category)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Category>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Category>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_category))
    }

    pub async fn update(&self, id: &str, mut category: Category) -> Result<Option<Category>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        category.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, category, None).await?;
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
