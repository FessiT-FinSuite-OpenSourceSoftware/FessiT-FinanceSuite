use crate::models::expense::Expense;
use crate::repository::expense_repository::{ExpenseRepository, ExpenseSummary};
use mongodb::bson::DateTime;

#[derive(Clone)]
pub struct ExpenseService {
    repo: ExpenseRepository,
}

impl ExpenseService {
    pub fn new(repo: ExpenseRepository) -> Self {
        Self { repo }
    }

    /// Create a new expense with validation
    pub async fn create_expense(&self, mut req: Expense) -> mongodb::error::Result<Expense> {
        // Validate required fields
        if req.expense_title.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Expense title is required"));
        }

        if req.project_cost_center.trim().is_empty() {
            return Err(mongodb::error::Error::custom(
                "Project/Cost center is required",
            ));
        }

        // Calculate total amount from items
        let calculated_total: f64 = req.items.iter().map(|item| item.amount).sum();
        req.total_amount = calculated_total;

        // Ensure timestamps are set
        let now = DateTime::now();
        if req.created_at.is_none() {
            req.created_at = Some(now);
        }
        if req.updated_at.is_none() {
            req.updated_at = Some(now);
        }

        // Validate amounts are non-negative
        if req.total_amount < 0.0 {
            return Err(mongodb::error::Error::custom(
                "Total amount cannot be negative",
            ));
        }

        for (idx, item) in req.items.iter().enumerate() {
            if item.amount < 0.0 {
                return Err(mongodb::error::Error::custom(format!(
                    "Item {} amount cannot be negative",
                    idx + 1
                )));
            }
        }

        self.repo.create_expense(req).await
    }

    /// Get all expenses with optional pagination
    pub async fn get_all_expenses(
        &self,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        self.repo.get_all_expenses(page, limit).await
    }

    /// Get expenses by project/cost center
    pub async fn get_expenses_by_project(
        &self,
        project_cost_center: &str,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        self.repo
            .get_expenses_by_project(project_cost_center, page, limit)
            .await
    }

    /// Get expenses within a date range
    pub async fn get_expenses_by_date_range(
        &self,
        start_date: DateTime,
        end_date: DateTime,
    ) -> mongodb::error::Result<Vec<Expense>> {
        if start_date > end_date {
            return Err(mongodb::error::Error::custom(
                "Start date must be before end date",
            ));
        }

        self.repo
            .get_expenses_by_date_range(start_date, end_date)
            .await
    }

    /// Get a single expense by ID
    pub async fn get_expense_by_id(&self, id: &str) -> mongodb::error::Result<Option<Expense>> {
        self.repo.get_expense_by_id(id).await
    }

    /// Update an existing expense
    pub async fn update_expense(
        &self,
        id: &str,
        mut req: Expense,
    ) -> mongodb::error::Result<Option<Expense>> {
        // Validate the expense exists
        let existing = self.repo.get_expense_by_id(id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        // Validate required fields
        if req.expense_title.trim().is_empty() {
            return Err(mongodb::error::Error::custom("Expense title is required"));
        }

        if req.project_cost_center.trim().is_empty() {
            return Err(mongodb::error::Error::custom(
                "Project/Cost center is required",
            ));
        }

        // Recalculate total amount from items
        let calculated_total: f64 = req.items.iter().map(|item| item.amount).sum();
        req.total_amount = calculated_total;

        // Update the updated_at timestamp
        req.updated_at = Some(DateTime::now());

        // Validate amounts are non-negative
        if req.total_amount < 0.0 {
            return Err(mongodb::error::Error::custom(
                "Total amount cannot be negative",
            ));
        }

        for (idx, item) in req.items.iter().enumerate() {
            if item.amount < 0.0 {
                return Err(mongodb::error::Error::custom(format!(
                    "Item {} amount cannot be negative",
                    idx + 1
                )));
            }
        }

        self.repo.update_expense(id, req).await
    }

    /// Delete an expense
    pub async fn delete_expense(&self, id: &str) -> mongodb::error::Result<bool> {
        self.repo.delete_expense(id).await
    }

    /// Get total count of expenses
    pub async fn count_expenses(&self) -> mongodb::error::Result<u64> {
        self.repo.count_expenses().await
    }

    /// Get count of expenses by project
    pub async fn count_expenses_by_project(
        &self,
        project_cost_center: &str,
    ) -> mongodb::error::Result<u64> {
        self.repo
            .count_expenses_by_project(project_cost_center)
            .await
    }

    /// Get total expense amount by project
    pub async fn get_total_amount_by_project(
        &self,
        project_cost_center: &str,
    ) -> mongodb::error::Result<f64> {
        self.repo
            .get_total_amount_by_project(project_cost_center)
            .await
    }

    /// Search expenses by title
    pub async fn search_expenses(&self, search_term: &str) -> mongodb::error::Result<Vec<Expense>> {
        if search_term.trim().is_empty() {
            return self.repo.get_all_expenses(None, None).await;
        }

        self.repo.search_expenses_by_title(search_term).await
    }

    /// Get all unique project/cost centers
    pub async fn get_all_projects(&self) -> mongodb::error::Result<Vec<String>> {
        self.repo.get_all_projects().await
    }

    /// Get expense statistics summary
    pub async fn get_expense_summary(&self) -> mongodb::error::Result<ExpenseSummary> {
        self.repo.get_expense_summary().await
    }

    /// Get expenses with filters
    pub async fn get_expenses_filtered(
        &self,
        project_cost_center: Option<String>,
        start_date: Option<DateTime>,
        end_date: Option<DateTime>,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        match (project_cost_center, start_date, end_date) {
            // Filter by project only
            (Some(project), None, None) => {
                self.repo
                    .get_expenses_by_project(&project, page, limit)
                    .await
            }
            // Filter by date range only
            (None, Some(start), Some(end)) => {
                if start > end {
                    return Err(mongodb::error::Error::custom(
                        "Start date must be before end date",
                    ));
                }
                self.repo.get_expenses_by_date_range(start, end).await
            }
            // No filters - get all
            (None, None, None) => self.repo.get_all_expenses(page, limit).await,
            // Other combinations - fallback to getting all expenses
            _ => self.repo.get_all_expenses(page, limit).await,
        }
    }

    /// Validate expense data (can be used before create/update)
    pub fn validate_expense(&self, expense: &Expense) -> Result<(), String> {
        if expense.expense_title.trim().is_empty() {
            return Err("Expense title is required".to_string());
        }

        if expense.project_cost_center.trim().is_empty() {
            return Err("Project/Cost center is required".to_string());
        }

        if expense.items.is_empty() {
            return Err("At least one expense item is required".to_string());
        }

        for (idx, item) in expense.items.iter().enumerate() {
            if item.amount < 0.0 {
                return Err(format!("Item {} amount cannot be negative", idx + 1));
            }

            if item.expense_category.trim().is_empty() {
                return Err(format!("Item {} must have a category", idx + 1));
            }

            if item.currency.trim().is_empty() {
                return Err(format!("Item {} must have a currency", idx + 1));
            }
        }

        let calculated_total: f64 = expense.items.iter().map(|item| item.amount).sum();
        if calculated_total < 0.0 {
            return Err("Total amount cannot be negative".to_string());
        }

        Ok(())
    }

    /// Calculate statistics for a specific project
    pub async fn get_project_statistics(
        &self,
        project_cost_center: &str,
    ) -> mongodb::error::Result<ProjectStatistics> {
        let expenses = self
            .repo
            .get_expenses_by_project(project_cost_center, None, None)
            .await?;

        let total_count = expenses.len();
        let total_amount: f64 = expenses.iter().map(|e| e.total_amount).sum();
        let avg_amount = if total_count > 0 {
            total_amount / (total_count as f64)
        } else {
            0.0
        };

        let min_amount = expenses
            .iter()
            .map(|e| e.total_amount)
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        let max_amount = expenses
            .iter()
            .map(|e| e.total_amount)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        Ok(ProjectStatistics {
            project_name: project_cost_center.to_string(),
            total_expenses: total_count,
            total_amount,
            avg_amount,
            min_amount,
            max_amount,
        })
    }
}

/// Statistics for a specific project
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectStatistics {
    pub project_name: String,
    pub total_expenses: usize,
    pub total_amount: f64,
    pub avg_amount: f64,
    pub min_amount: f64,
    pub max_amount: f64,
}