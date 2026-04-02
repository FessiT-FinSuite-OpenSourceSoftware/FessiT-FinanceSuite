use std::sync::Arc;

use crate::{
    models::category::Category,
    repository::{
        category_repository::CategoryRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct CategoryService {
    repo: Arc<CategoryRepository>,
    user_repo: Arc<UserRepository>,
}

impl CategoryService {
    pub fn new(repo: CategoryRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut category: Category, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Category> {
        category.organisation_id = Some(*org_id);
        Ok(self.repo.create(category).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Category>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Category>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, category: Category) -> anyhow::Result<Option<Category>> {
        Ok(self.repo.update(id, category).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
