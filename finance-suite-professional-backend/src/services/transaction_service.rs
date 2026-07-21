use std::sync::Arc;
use mongodb::bson::oid::ObjectId;
use crate::{
    models::transaction::Transaction,
    repository::{transaction_repository::TransactionRepository, user_repository::UserRepository},
};

#[derive(Clone)]
pub struct TransactionService {
    repo: Arc<TransactionRepository>,
    user_repo: Arc<UserRepository>,
}

impl TransactionService {
    pub fn new(repo: TransactionRepository, user_repo: UserRepository) -> Self {
        Self { repo: Arc::new(repo), user_repo: Arc::new(user_repo) }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn save_many(&self, mut items: Vec<Transaction>, org_id: &ObjectId) -> anyhow::Result<Vec<Transaction>> {
        for t in &mut items { t.organisation_id = Some(*org_id); }
        Ok(self.repo.insert_many(items).await?)
    }

    pub async fn list(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Transaction>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Transaction>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, t: Transaction) -> anyhow::Result<Option<Transaction>> {
        Ok(self.repo.update(id, t).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
