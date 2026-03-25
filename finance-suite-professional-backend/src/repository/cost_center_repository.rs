use std::sync::Arc;
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection,
};
use futures::stream::TryStreamExt;
use crate::error::ApiError;
use crate::models::costcenter::CostCenter;

#[derive(Clone)]
pub struct CostCenterRepository {
    collection: Arc<Collection<CostCenter>>,
}

impl CostCenterRepository {
    pub fn new(collection: Collection<CostCenter>) -> Self {
        Self { collection: Arc::new(collection) }
    }

    pub async fn create(&self, cost_center: CostCenter) -> Result<CostCenter, ApiError> {
        let result = self.collection.insert_one(&cost_center, None).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        let mut created = cost_center;
        created.id = result.inserted_id.as_object_id();
        Ok(created)
    }

    pub async fn find_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<CostCenter>, ApiError> {
        let filter = doc! { "organisationId": org_id };
        let mut cursor = self.collection.find(filter, None).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        let mut results = Vec::new();
        while let Some(doc) = cursor.try_next().await.map_err(|e| ApiError::DatabaseError(e.to_string()))? {
            results.push(doc);
        }
        Ok(results)
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<CostCenter>, ApiError> {
        let oid = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": oid };
        self.collection.find_one(filter, None).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))
    }

    pub async fn update(&self, id: &str, req: crate::models::costcenter::UpdateCostCenterRequest) -> Result<Option<CostCenter>, ApiError> {
        let oid = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": oid };
        let mut set_doc = doc! {};
        if let Some(name) = req.project_name { set_doc.insert("projectName", name); }
        if let Some(status) = req.status { set_doc.insert("status", status); }
        if let Some(desc) = req.description { set_doc.insert("description", desc); }
        if set_doc.is_empty() {
            return self.find_by_id(id).await;
        }
        let update = doc! { "$set": set_doc };
        self.collection.update_one(filter, update, None).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        self.find_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let oid = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": oid };
        let result = self.collection.delete_one(filter, None).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        Ok(result.deleted_count > 0)
    }
}
