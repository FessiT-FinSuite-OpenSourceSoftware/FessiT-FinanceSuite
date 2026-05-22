use std::sync::Arc;

use crate::{
    models::employee::Employee,
    repository::{
        employee_repository::{EmployeePage, EmployeeRepository},
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct EmployeeService {
    repo:      Arc<EmployeeRepository>,
    user_repo: Arc<UserRepository>,
}

impl EmployeeService {
    pub fn new(repo: EmployeeRepository, user_repo: UserRepository) -> Self {
        Self { repo: Arc::new(repo), user_repo: Arc::new(user_repo) }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    /// Resolve the reporting manager's display name from their employee record.
    async fn resolve_manager_name(
        &self,
        manager_id: Option<&mongodb::bson::oid::ObjectId>,
    ) -> Option<String> {
        let id = manager_id?;
        let emp = self.repo.get_by_id(&id.to_hex()).await.ok()??;
        let name = format!("{} {}", emp.first_name, emp.last_name).trim().to_string();
        if name.is_empty() { None } else { Some(name) }
    }

    pub async fn create(
        &self,
        mut employee: Employee,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<Employee> {
        employee.organisation_id = Some(*org_id);
        employee.reporting_manager_name =
            self.resolve_manager_name(employee.reporting_manager_id.as_ref()).await;
        Ok(self.repo.create(employee).await?)
    }

    pub async fn list_page(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        search: &str,
        department: &str,
        employee_type: &str,
        status: &str,
        page: u64,
        page_size: u64,
    ) -> anyhow::Result<EmployeePage> {
        Ok(self.repo.get_page(org_id, search, department, employee_type, status, page, page_size).await?)
    }

    pub async fn get_all_for_org(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<Vec<Employee>> {
        Ok(self.repo.get_all_for_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Employee>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, mut employee: Employee) -> anyhow::Result<Option<Employee>> {
        employee.reporting_manager_name =
            self.resolve_manager_name(employee.reporting_manager_id.as_ref()).await;
        Ok(self.repo.update(id, employee).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
