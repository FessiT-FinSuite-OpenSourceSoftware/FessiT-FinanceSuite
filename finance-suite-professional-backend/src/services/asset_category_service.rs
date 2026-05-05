use std::sync::Arc;

use crate::{
    models::asset_category::AssetCategory,
    repository::{
        asset_category_repository::AssetCategoryRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct AssetCategoryService {
    repo: Arc<AssetCategoryRepository>,
    user_repo: Arc<UserRepository>,
}

impl AssetCategoryService {
    pub fn new(repo: AssetCategoryRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut category: AssetCategory, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<AssetCategory> {
        category.organisation_id = Some(*org_id);
        Ok(self.repo.create(category).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<AssetCategory>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<AssetCategory>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, category: AssetCategory) -> anyhow::Result<Option<AssetCategory>> {
        Ok(self.repo.update(id, category).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
