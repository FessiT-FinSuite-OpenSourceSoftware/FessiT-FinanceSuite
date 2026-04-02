use std::sync::Arc;

use crate::{
    models::salary::Salary,
    repository::{
        salary_repository::SalaryRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct SalaryService {
    repo: Arc<SalaryRepository>,
    user_repo: Arc<UserRepository>,
}

impl SalaryService {
    pub fn new(repo: SalaryRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut salary: Salary, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Salary> {
        salary.organisation_id = Some(*org_id);
        Ok(self.repo.create(salary).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Salary>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Salary>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, salary: Salary) -> anyhow::Result<Option<Salary>> {
        Ok(self.repo.update(id, salary).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    pub async fn get_monthly_tds_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<crate::repository::salary_repository::SalaryTdsSummary> {
        Ok(self.repo.get_monthly_tds_summary(org_id).await?)
    }
}
