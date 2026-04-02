use std::sync::Arc;

use crate::{
    models::general_expense::GeneralExpense,
    repository::{
        general_expense_repository::GeneralExpenseRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct GeneralExpenseService {
    repo: Arc<GeneralExpenseRepository>,
    user_repo: Arc<UserRepository>,
}

impl GeneralExpenseService {
    pub fn new(repo: GeneralExpenseRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut expense: GeneralExpense, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<GeneralExpense> {
        expense.organisation_id = Some(*org_id);
        Ok(self.repo.create(expense).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<GeneralExpense>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<GeneralExpense>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, expense: GeneralExpense) -> anyhow::Result<Option<GeneralExpense>> {
        Ok(self.repo.update(id, expense).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    pub async fn get_monthly_gst_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<crate::repository::general_expense_repository::GeneralExpenseMonthlyGstSummary> {
        Ok(self.repo.get_monthly_gst_summary(org_id).await?)
    }
}
