use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

use crate::models::assets::Asset;

#[derive(Clone)]
pub struct AssetRepository {
    collection: Arc<Collection<Asset>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_asset(raw: Document) -> Option<Asset> {
    let oid = raw.get_object_id("_id").ok();
    let mut asset: Asset = from_document(raw).ok()?;
    asset.id = oid;
    Some(asset)
}

impl AssetRepository {
    pub fn new(collection: Collection<Asset>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Asset>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(a) = doc_to_asset(raw) {
                list.push(a);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut asset: Asset) -> Result<Asset, MongoError> {
        let result = self.collection.insert_one(&asset, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            asset.id = Some(id);
        }
        Ok(asset)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Asset>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Asset>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_asset))
    }

    pub async fn update(&self, id: &str, mut asset: Asset) -> Result<Option<Asset>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        asset.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, asset, None).await?;
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

    pub async fn update_status(
        &self,
        id: &str,
        status: &crate::models::assets::AssetStatus,
    ) -> Result<Option<Asset>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let status_bson = mongodb::bson::to_bson(status)
            .map_err(|e| MongoError::custom(e.to_string()))?;
        let result = self.raw_collection
            .update_one(doc! { "_id": oid }, doc! { "$set": { "asset_status": status_bson } }, None)
            .await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }
}
