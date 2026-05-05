use std::sync::Arc;

use crate::{
    models::assets::{Asset, AssetStatus},
    repository::{asset_repository::AssetRepository, user_repository::UserRepository},
};

#[derive(Clone)]
pub struct AssetService {
    repo: Arc<AssetRepository>,
    user_repo: Arc<UserRepository>,
}

impl AssetService {
    pub fn new(repo: AssetRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<crate::models::users::User> {
        self.user_repo.get_user_by_id(user_id).await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))
    }

    pub async fn create(&self, mut asset: Asset, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Asset> {
        asset.organisation_id = Some(*org_id);
        Ok(self.repo.create(asset).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Asset>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Asset>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, asset: Asset) -> anyhow::Result<Option<Asset>> {
        Ok(self.repo.update(id, asset).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    pub async fn update_status(&self, id: &str, status: &AssetStatus) -> anyhow::Result<Option<Asset>> {
        Ok(self.repo.update_status(id, status).await?)
    }
}
