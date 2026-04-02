use std::sync::Arc;

use crate::{
    models::product::Product,
    repository::{
        product_repository::ProductRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct ProductService {
    repo: Arc<ProductRepository>,
    user_repo: Arc<UserRepository>,
}

impl ProductService {
    pub fn new(repo: ProductRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut product: Product, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Product> {
        product.organisation_id = Some(*org_id);
        Ok(self.repo.create(product).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Product>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Product>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, product: Product) -> anyhow::Result<Option<Product>> {
        Ok(self.repo.update(id, product).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
