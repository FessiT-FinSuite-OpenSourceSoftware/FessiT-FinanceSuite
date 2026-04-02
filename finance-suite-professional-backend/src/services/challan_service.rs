use std::sync::Arc;

use crate::{
    models::challan::Challan,
    repository::{
        challan_repository::ChallanRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct ChallanService {
    repo: Arc<ChallanRepository>,
    user_repo: Arc<UserRepository>,
}

impl ChallanService {
    pub fn new(repo: ChallanRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut challan: Challan, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Challan> {
        challan.organisation_id = Some(*org_id);
        Ok(self.repo.create(challan).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Challan>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Challan>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, challan: Challan) -> anyhow::Result<Option<Challan>> {
        Ok(self.repo.update(id, challan).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
