use std::sync::Arc;

use crate::{
    models::purchase_order::PurchaseOrder,
    models::users::{User, UserPermissions},
    repository::purchase_order_repository::PurchaseOrderRepository,
    repository::user_repository::UserRepository,
};
use mongodb::bson::oid::ObjectId;

#[derive(Clone)]
pub struct PurchaseOrderService {
    repo: Arc<PurchaseOrderRepository>,
    user_repo: Arc<UserRepository>,
}

impl PurchaseOrderService {
    pub fn new(repo: PurchaseOrderRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<UserPermissions> {
        let user = self.user_repo.get_user_by_id(user_id).await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))?;
        Ok(user.permissions)
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<User> {
        let user = self.user_repo.get_user_by_id(user_id).await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))?;
        Ok(user)
    }

    pub async fn get_purchase_orders_by_organisation(&self, org_id: &ObjectId) -> anyhow::Result<Vec<PurchaseOrder>> {
        let pos = self.repo.get_purchase_orders_by_organisation(org_id).await?;
        Ok(pos)
    }

    pub async fn create_purchase_order(&self, po: PurchaseOrder) -> anyhow::Result<PurchaseOrder> {
        let created = self.repo.create_purchase_order(po).await?;
        Ok(created)
    }

    pub async fn get_all_purchase_orders(&self) -> anyhow::Result<Vec<PurchaseOrder>> {
        let pos = self.repo.get_all_purchase_orders().await?;
        Ok(pos)
    }

    pub async fn get_purchase_order_by_id(&self, id: &str) -> anyhow::Result<Option<PurchaseOrder>> {
        let po = self.repo.get_purchase_order_by_id(id).await?;
        Ok(po)
    }

    pub async fn update_purchase_order(
        &self,
        id: &str,
        po: PurchaseOrder,
    ) -> anyhow::Result<Option<PurchaseOrder>> {
        let updated = self.repo.update_purchase_order(id, po).await?;
        Ok(updated)
    }

    pub async fn delete_purchase_order(&self, id: &str) -> anyhow::Result<bool> {
        let deleted = self.repo.delete_purchase_order(id).await?;
        Ok(deleted)
    }
}
