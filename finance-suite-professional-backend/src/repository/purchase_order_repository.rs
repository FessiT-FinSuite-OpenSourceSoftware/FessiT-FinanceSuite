use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId},
    error::Error as MongoError,
    Collection,
};

use crate::models::purchase_order::PurchaseOrder;
use futures::stream::TryStreamExt;

#[derive(Clone)]
pub struct PurchaseOrderRepository {
    collection: Arc<Collection<PurchaseOrder>>,
}

impl PurchaseOrderRepository {
    pub fn new(collection: Collection<PurchaseOrder>) -> Self {
        Self {
            collection: Arc::new(collection),
        }
    }

    pub async fn create_purchase_order(&self, mut po: PurchaseOrder) -> Result<PurchaseOrder, MongoError> {
        let insert_result = self.collection.insert_one(&po, None).await?;

        if let Some(id) = insert_result.inserted_id.as_object_id() {
            po.id = Some(id);
        }

        Ok(po)
    }

    pub async fn get_all_purchase_orders(&self) -> Result<Vec<PurchaseOrder>, MongoError> {
        let mut cursor = self.collection.find(None, None).await?;
        let mut pos = Vec::new();

        while let Some(doc) = cursor.try_next().await.unwrap_or(None) {
            pos.push(doc);
        }

        Ok(pos)
    }

    pub async fn get_purchase_orders_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<PurchaseOrder>, MongoError> {
        let filter = doc! { "organisationId": org_id };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut pos = Vec::new();

        while let Some(doc) = cursor.try_next().await.unwrap_or(None) {
            pos.push(doc);
        }

        Ok(pos)
    }

    pub async fn get_purchase_order_by_id(&self, id: &str) -> Result<Option<PurchaseOrder>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let filter = doc! { "_id": oid };
        let po = self.collection.find_one(filter, None).await?;

        Ok(po)
    }

    pub async fn update_purchase_order(
        &self,
        id: &str,
        po: PurchaseOrder,
    ) -> Result<Option<PurchaseOrder>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let mut po_to_update = po.clone();
        po_to_update.id = Some(oid);

        let filter = doc! { "_id": oid };

        let update_result = self
            .collection
            .replace_one(filter, po_to_update, None)
            .await?;

        if update_result.matched_count == 0 {
            Ok(None)
        } else {
            self.get_purchase_order_by_id(id).await
        }
    }

    pub async fn delete_purchase_order(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(false),
        };

        let filter = doc! { "_id": oid };

        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }
}
