use std::sync::Arc;
use crate::{
    models::delivery_challan::DeliveryChallan,
    repository::{
        delivery_challan_repository::DeliveryChallanRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct DeliveryChallanService {
    repo: Arc<DeliveryChallanRepository>,
    user_repo: Arc<UserRepository>,
}

impl DeliveryChallanService {
    pub fn new(repo: DeliveryChallanRepository, user_repo: UserRepository) -> Self {
        Self { repo: Arc::new(repo), user_repo: Arc::new(user_repo) }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut dc: DeliveryChallan, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<DeliveryChallan> {
        dc.organisation_id = Some(*org_id);
        Ok(self.repo.create(dc).await?)
    }

    pub async fn list_paginated(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        page: u64,
        page_size: u64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<DeliveryChallan>, u64)> {
        Ok(self.repo.get_by_org_paginated(org_id, page, page_size, search, status).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<DeliveryChallan>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, dc: DeliveryChallan) -> anyhow::Result<Option<DeliveryChallan>> {
        Ok(self.repo.update(id, dc).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
