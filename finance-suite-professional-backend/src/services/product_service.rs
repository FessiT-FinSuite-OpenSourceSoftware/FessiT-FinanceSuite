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

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<crate::models::users::User> {
        self.user_repo.get_user_by_id(user_id).await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))
    }

    pub async fn ensure_indexes(&self) -> anyhow::Result<()> {
        Ok(self.repo.ensure_indexes().await?)
    }

    pub async fn name_exists_in_org(
        &self,
        name: &str,
        org_id: &mongodb::bson::oid::ObjectId,
        exclude_id: Option<&mongodb::bson::oid::ObjectId>,
    ) -> anyhow::Result<bool> {
        Ok(self.repo.name_exists_in_org(name, org_id, exclude_id).await?)
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

    pub async fn add_stock(&self, id: &str, quantity: f64) -> anyhow::Result<Option<Product>> {
        Ok(self.repo.add_stock(id, quantity).await?)
    }
}
