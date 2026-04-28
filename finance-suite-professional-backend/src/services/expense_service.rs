use crate::models::expense::Expense;
use crate::repository::expense_repository::{ExpenseRepository, ExpenseSummary};
use crate::repository::user_repository::UserRepository;
use mongodb::bson::{DateTime, oid::ObjectId};
use std::sync::Arc;

#[derive(Clone)]
pub struct ExpenseService {
    repo: ExpenseRepository,
    user_repo: Arc<UserRepository>,
}

impl ExpenseService {
    pub fn new(repo: ExpenseRepository, user_repo: UserRepository) -> Self {
        Self { 
            repo,
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> mongodb::error::Result<Option<crate::models::users::User>> {
        self.user_repo.get_user_by_id(user_id).await
    }

    pub async fn get_expenses_by_organisation(
        &self,
        org_id: &ObjectId,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.get_expenses_by_organisation(org_id, page, limit).await
    }

    pub async fn get_expenses_by_project_and_organisation(
        &self,
        org_id: &ObjectId,
        project_cost_center: &str,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.get_expenses_by_project_and_organisation(org_id, project_cost_center, page, limit).await
    }

    pub async fn search_expenses_by_organisation(
        &self,
        org_id: &ObjectId,
        search_term: &str,
    ) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.search_expenses_by_organisation(org_id, search_term).await
    }

    pub async fn count_expenses_by_organisation(&self, org_id: &ObjectId) -> mongodb::error::Result<u64> {
        self.repo.count_expenses_by_organisation(org_id).await
    }

    pub async fn count_expenses_by_project_and_organisation(
        &self,
        org_id: &ObjectId,
        project_cost_center: &str,
    ) -> mongodb::error::Result<u64> {
        self.repo.count_expenses_by_project_and_organisation(org_id, project_cost_center).await
    }

    pub async fn create_expense(&self, mut req: Expense) -> mongodb::error::Result<Expense> {
        if req.expense_title.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Expense title is required"));
        }
        if req.project_cost_center.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Project/Cost center is required"));
        }
        let calculated_total: f64 = req.items.iter().map(|item| item.sub_total).sum();
        req.base_amount = req.items.iter().map(|item| item.amount).sum();
        req.total_amount = calculated_total;
        let now = DateTime::now();
        if req.created_at.is_none() { req.created_at = Some(now); }
        if req.updated_at.is_none() { req.updated_at = Some(now); }
        if req.total_amount < 0.0 {
            return Err(mongodb::error::Error::custom("Total amount cannot be negative"));
        }
        for (idx, item) in req.items.iter().enumerate() {
            if item.amount < 0.0 {
                return Err(mongodb::error::Error::custom(format!("Item {} amount cannot be negative", idx + 1)));
            }
        }
        self.repo.create_expense(req).await
    }

    pub async fn get_all_expenses(&self, page: Option<u64>, limit: Option<i64>) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.get_all_expenses(page, limit).await
    }

    pub async fn get_expenses_by_project(&self, project_cost_center: &str, page: Option<u64>, limit: Option<i64>) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.get_expenses_by_project(project_cost_center, page, limit).await
    }

    pub async fn get_expenses_by_date_range(&self, start_date: DateTime, end_date: DateTime) -> mongodb::error::Result<Vec<Expense>> {
        if start_date > end_date {
            return Err(mongodb::error::Error::custom("Start date must be before end date"));
        }
        self.repo.get_expenses_by_date_range(start_date, end_date).await
    }

    pub async fn get_expense_by_id(&self, id: &str) -> mongodb::error::Result<Option<Expense>> {
        self.repo.get_expense_by_id(id).await
    }

    pub async fn update_expense(&self, id: &str, mut req: Expense) -> mongodb::error::Result<Option<Expense>> {
        let existing = self.repo.get_expense_by_id(id).await?;
        if existing.is_none() { return Ok(None); }
        if req.expense_title.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Expense title is required"));
        }
        if req.project_cost_center.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Project/Cost center is required"));
        }
        let calculated_total: f64 = req.items.iter().map(|item| item.sub_total).sum();
        req.base_amount = req.items.iter().map(|item| item.amount).sum();
        req.total_amount = calculated_total;
        req.updated_at = Some(DateTime::now());
        if req.total_amount < 0.0 {
            return Err(mongodb::error::Error::custom("Total amount cannot be negative"));
        }
        for (idx, item) in req.items.iter().enumerate() {
            if item.amount < 0.0 {
                return Err(mongodb::error::Error::custom(format!("Item {} amount cannot be negative", idx + 1)));
            }
        }
        self.repo.update_expense(id, req).await
    }

    pub async fn delete_expense(&self, id: &str) -> mongodb::error::Result<bool> {
        self.repo.delete_expense(id).await
    }

    pub async fn count_expenses(&self) -> mongodb::error::Result<u64> {
        self.repo.count_expenses().await
    }

    pub async fn count_expenses_by_project(&self, project_cost_center: &str) -> mongodb::error::Result<u64> {
        self.repo.count_expenses_by_project(project_cost_center).await
    }

    pub async fn get_total_amount_by_project(&self, project_cost_center: &str) -> mongodb::error::Result<f64> {
        self.repo.get_total_amount_by_project(project_cost_center).await
    }

    pub async fn search_expenses(&self, search_term: &str) -> mongodb::error::Result<Vec<Expense>> {
        if search_term.trim().is_empty() {
            return self.repo.get_all_expenses(None, None).await;
        }
        self.repo.search_expenses_by_title(search_term).await
    }

    pub async fn get_all_projects(&self) -> mongodb::error::Result<Vec<String>> {
        self.repo.get_all_projects().await
    }

    pub async fn get_expense_summary(&self) -> mongodb::error::Result<ExpenseSummary> {
        self.repo.get_expense_summary().await
    }

    pub async fn get_monthly_gst_summary(
        &self,
        org_id: &ObjectId,
        year: &str,
        month: &str,
    ) -> mongodb::error::Result<crate::repository::expense_repository::ExpenseMonthlyGstSummary> {
        self.repo.get_monthly_gst_summary(org_id, year, month).await
    }

    pub async fn get_expenses_filtered(
        &self,
        project_cost_center: Option<String>,
        start_date: Option<DateTime>,
        end_date: Option<DateTime>,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        match (project_cost_center, start_date, end_date) {
            (Some(project), None, None) => self.repo.get_expenses_by_project(&project, page, limit).await,
            (None, Some(start), Some(end)) => {
                if start > end {
                    return Err(mongodb::error::Error::custom("Start date must be before end date"));
                }
                self.repo.get_expenses_by_date_range(start, end).await
            }
            (None, None, None) => self.repo.get_all_expenses(page, limit).await,
            _ => self.repo.get_all_expenses(page, limit).await,
        }
    }

    pub fn validate_expense(&self, expense: &Expense) -> Result<(), String> {
        if expense.expense_title.trim().is_empty() { return Err("Expense title is required".to_string()); }
        if expense.project_cost_center.trim().is_empty() { return Err("Project/Cost center is required".to_string()); }
        if expense.items.is_empty() { return Err("At least one expense item is required".to_string()); }
        for (idx, item) in expense.items.iter().enumerate() {
            if item.amount < 0.0 { return Err(format!("Item {} amount cannot be negative", idx + 1)); }
            if item.expense_category.trim().is_empty() { return Err(format!("Item {} must have a category", idx + 1)); }
            if item.currency.trim().is_empty() { return Err(format!("Item {} must have a currency", idx + 1)); }
        }
        let calculated_total: f64 = expense.items.iter().map(|item| item.amount).sum();
        if calculated_total < 0.0 { return Err("Total amount cannot be negative".to_string()); }
        Ok(())
    }

    pub async fn get_project_statistics(&self, project_cost_center: &str) -> mongodb::error::Result<ProjectStatistics> {
        let expenses = self.repo.get_expenses_by_project(project_cost_center, None, None).await?;
        let total_count = expenses.len();
        let total_amount: f64 = expenses.iter().map(|e| e.total_amount).sum();
        let avg_amount = if total_count > 0 { total_amount / (total_count as f64) } else { 0.0 };
        let min_amount = expenses.iter().map(|e| e.total_amount).min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap_or(0.0);
        let max_amount = expenses.iter().map(|e| e.total_amount).max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap_or(0.0);
        Ok(ProjectStatistics { project_name: project_cost_center.to_string(), total_expenses: total_count, total_amount, avg_amount, min_amount, max_amount })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectStatistics {
    pub project_name: String,
    pub total_expenses: usize,
    pub total_amount: f64,
    pub avg_amount: f64,
    pub min_amount: f64,
    pub max_amount: f64,
}
