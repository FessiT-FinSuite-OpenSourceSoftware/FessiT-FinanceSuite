use std::sync::Arc;
use std::collections::HashMap;

use futures::stream::TryStreamExt;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};

use crate::models::service::Service;

#[derive(Clone)]
pub struct ServiceRepository {
    collection: Arc<Collection<Service>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_service(raw: Document) -> Option<Service> {
    let oid = raw.get_object_id("_id").ok();
    let mut service: Service = from_document(raw).ok()?;
    service.id = oid;
    Some(service)
}

impl ServiceRepository {
    pub fn new(collection: Collection<Service>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Service>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(service) = doc_to_service(raw) {
                list.push(service);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut service: Service) -> Result<Service, MongoError> {
        let result = self.collection.insert_one(&service, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            service.id = Some(id);
        }
        Ok(service)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Service>, MongoError> {
        println!("🔍 Fetching services for org_id: {:?}", org_id);
        let org_id_str = org_id.to_hex();
        self.fetch_many(doc! {
            "$or": [
                { "organisationId": org_id },
                { "organisationId": &org_id_str }
            ]
        }).await
    }

    pub async fn get_by_ids(&self, ids: &[ObjectId]) -> Result<Vec<Service>, MongoError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let services = self.fetch_many(doc! { "_id": { "$in": ids } }).await?;
        let mut by_id: HashMap<ObjectId, Service> = HashMap::with_capacity(services.len());
        for service in services {
            if let Some(id) = service.id {
                by_id.insert(id, service);
            }
        }

        Ok(ids
            .iter()
            .filter_map(|id| by_id.get(id).cloned())
            .collect())
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Service>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(value) => value,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_service))
    }

    pub async fn update(&self, id: &str, mut service: Service) -> Result<Option<Service>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(value) => value,
            Err(_) => return Ok(None),
        };
        service.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, service, None).await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }
}
