use std::sync::Arc;

use crate::{
    models::salary::Salary,
    repository::{
        salary_repository::SalaryRepository,
        user_repository::UserRepository,
        organisation_repository::OrganisationRepository,
    },
};

#[derive(Clone)]
pub struct SalaryService {
    repo: Arc<SalaryRepository>,
    user_repo: Arc<UserRepository>,
    org_repo: Arc<OrganisationRepository>,
}

impl SalaryService {
    pub fn new(repo: SalaryRepository, user_repo: UserRepository, org_repo: OrganisationRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
            org_repo: Arc::new(org_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut salary: Salary, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Salary> {
        salary.organisation_id = Some(*org_id);

        // Fetch professional_tax from org settings (not user-editable)
        let professional_tax = self.org_repo
            .find_by_id(&org_id.to_hex()).await
            .ok()
            .flatten()
            .map(|org| org.professional_tax_amount)
            .unwrap_or_default();
        salary.professional_tax = professional_tax;

        // Compute net_salary = gross + reimbursement - tds - professional_tax
        let gross = salary.gross_salary.parse::<f64>().unwrap_or(0.0);
        let reimb = salary.reimbursement.parse::<f64>().unwrap_or(0.0);
        let tds   = salary.tds.parse::<f64>().unwrap_or(0.0);
        let pt    = salary.professional_tax.parse::<f64>().unwrap_or(0.0);
        salary.net_salary = (gross + reimb - tds - pt).to_string();

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

    pub async fn get_pt_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        year: &str,
        month: &str,
    ) -> anyhow::Result<PtSummary> {
        let salaries = self.repo.get_by_org(org_id).await?;
        let mut total_pt_deducted = 0.0f64;
        let mut salary_count = 0u32;
        for sal in &salaries {
            let period = sal.period.trim();
            if period.len() < 7 { continue; }
            if &period[0..4] != year || &period[5..7] != month { continue; }
            let pt = sal.professional_tax.parse::<f64>().unwrap_or(0.0);
            if pt <= 0.0 { continue; }
            salary_count += 1;
            total_pt_deducted += pt;
        }
        Ok(PtSummary { month: format!("{}-{}", year, month), salary_count, total_pt_deducted })
    }

    pub async fn get_monthly_tds_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        year: &str,
        month: &str,
    ) -> anyhow::Result<crate::repository::salary_repository::SalaryTdsSummary> {
        Ok(self.repo.get_monthly_tds_summary(org_id, year, month).await?)
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PtSummary {
    pub month: String,
    pub salary_count: u32,
    pub total_pt_deducted: f64,
}
