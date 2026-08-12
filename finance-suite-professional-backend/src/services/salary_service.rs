use std::sync::Arc;

use crate::{
    models::salary::Salary,
    repository::{
        salary_repository::SalaryRepository,
        user_repository::UserRepository,
        organisation_repository::OrganisationRepository,
        employee_repository::EmployeeRepository,
    },
};

#[derive(Clone)]
pub struct SalaryService {
    repo: Arc<SalaryRepository>,
    user_repo: Arc<UserRepository>,
    org_repo: Arc<OrganisationRepository>,
    employee_repo: Arc<EmployeeRepository>,
}

impl SalaryService {
    pub fn new(repo: SalaryRepository, user_repo: UserRepository, org_repo: OrganisationRepository, employee_repo: EmployeeRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
            org_repo: Arc::new(org_repo),
            employee_repo: Arc::new(employee_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut salary: Salary, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Salary> {
        salary.organisation_id = Some(*org_id);

        // Populate PAN and user_id from employee record
        if let Some(emp_oid) = salary.employee_object_id {
            if let Ok(Some(emp)) = self.employee_repo.get_by_id(&emp_oid.to_hex()).await {
                if salary.pan.is_empty() {
                    salary.pan = emp.pan_number.clone();
                }
                if salary.employee_type.is_empty() {
                    salary.employee_type = format!("{:?}", emp.employee_type).to_lowercase();
                }
                if salary.user_id.is_none() && !emp.email.is_empty() {
                    if let Ok(Some(user)) = self.user_repo.get_user_by_email(&emp.email).await {
                        salary.user_id = user.id;
                    }
                }
            }
        } else if !salary.emp_id.is_empty() {
            // fallback: scan by emp_id string
            if let Ok(employees) = self.employee_repo.get_all_for_org(org_id).await {
                if let Some(emp) = employees.iter().find(|e| e.emp_id == salary.emp_id) {
                    if salary.pan.is_empty() { salary.pan = emp.pan_number.clone(); }
                    if salary.employee_type.is_empty() {
                        salary.employee_type = format!("{:?}", emp.employee_type).to_lowercase();
                    }
                    if salary.user_id.is_none() && !emp.email.is_empty() {
                        if let Ok(Some(user)) = self.user_repo.get_user_by_email(&emp.email).await {
                            salary.user_id = user.id;
                        }
                    }
                }
            }
        }

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
        let mut salaries = self.repo.get_by_org(org_id).await?;
        // Enrich pan and emp_name from live employee record for older records that lack them
        let needs_enrich = salaries.iter().any(|s| s.pan.is_empty() || s.emp_name.is_empty());
        if needs_enrich {
            let employees = self.employee_repo.get_all_for_org(org_id).await.unwrap_or_default();
            for s in salaries.iter_mut() {
                if s.pan.is_empty() || s.emp_name.is_empty() {
                    let emp = s.employee_object_id
                        .and_then(|oid| employees.iter().find(|e| e.id == Some(oid)))
                        .or_else(|| employees.iter().find(|e| e.emp_id == s.emp_id));
                    if let Some(emp) = emp {
                        if s.pan.is_empty() { s.pan = emp.pan_number.clone(); }
                        if s.emp_name.is_empty() {
                            s.emp_name = format!("{} {}", emp.first_name, emp.last_name).trim().to_string();
                        }
                        if s.employee_type.is_empty() {
                            s.employee_type = format!("{:?}", emp.employee_type).to_lowercase();
                        }
                    }
                }
            }
        }
        Ok(salaries)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Salary>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, mut salary: Salary) -> anyhow::Result<Option<Salary>> {
        if salary.user_id.is_none() {
            if let Some(emp_oid) = salary.employee_object_id {
                if let Ok(Some(emp)) = self.employee_repo.get_by_id(&emp_oid.to_hex()).await {
                    if !emp.email.is_empty() {
                        if let Ok(Some(user)) = self.user_repo.get_user_by_email(&emp.email).await {
                            salary.user_id = user.id;
                        }
                    }
                }
            } else if !salary.emp_id.is_empty() {
                if let Ok(employees) = self.employee_repo.get_all_for_org(
                    &salary.organisation_id.unwrap_or_default()
                ).await {
                    if let Some(emp) = employees.iter().find(|e| e.emp_id == salary.emp_id) {
                        if !emp.email.is_empty() {
                            if let Ok(Some(user)) = self.user_repo.get_user_by_email(&emp.email).await {
                                salary.user_id = user.id;
                            }
                        }
                    }
                }
            }
        }
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
