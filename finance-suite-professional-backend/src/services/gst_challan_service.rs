use std::sync::Arc;

use crate::{
    models::gst_challan::GstChallan,
    repository::{
        gst_challan_repository::GstChallanRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct GstChallanService {
    repo: Arc<GstChallanRepository>,
    user_repo: Arc<UserRepository>,
}

impl GstChallanService {
    pub fn new(repo: GstChallanRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut gst_challan: GstChallan, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<GstChallan> {
        gst_challan.organisation_id = Some(*org_id);
        Ok(self.repo.create(gst_challan).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<GstChallan>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<GstChallan>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, gst_challan: GstChallan) -> anyhow::Result<Option<GstChallan>> {
        Ok(self.repo.update(id, gst_challan).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
