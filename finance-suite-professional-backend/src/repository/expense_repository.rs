use crate::models::expense::Expense;
use futures::TryStreamExt;
use mongodb::{
    bson::{doc, oid::ObjectId, DateTime},
    options::FindOptions,
    Collection,
};

#[derive(Clone)]
pub struct ExpenseRepository {
    pub collection: Collection<Expense>,
}

impl ExpenseRepository {
    pub fn new(collection: Collection<Expense>) -> Self {
        Self { collection }
    }

    /// Create a new expense
    pub async fn create_expense(&self, expense: Expense) -> mongodb::error::Result<Expense> {
        let mut exp = expense;
        exp.id = None;

        let result = self.collection.insert_one(&exp, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            exp.id = Some(id);
        }

        Ok(exp)
    }

    /// Get all expenses with optional pagination
    pub async fn get_all_expenses(
        &self,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        let options = if let (Some(p), Some(l)) = (page, limit) {
            let skip = p.saturating_sub(1) * (l as u64);
            Some(
                FindOptions::builder()
                    .skip(skip)
                    .limit(l)
                    .sort(doc! { "created_at": -1 }) // Most recent first
                    .build(),
            )
        } else {
            Some(FindOptions::builder().sort(doc! { "created_at": -1 }).build())
        };

        let mut cursor = self.collection.find(None, options).await?;
        let mut list = Vec::new();

        while let Some(expense) = cursor.try_next().await? {
            list.push(expense);
        }

        Ok(list)
    }

    /// Get expenses filtered by project/cost center
    pub async fn get_expenses_by_project(
        &self,
        project_cost_center: &str,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> mongodb::error::Result<Vec<Expense>> {
        let filter = doc! { "project_cost_center": project_cost_center };

        let options = if let (Some(p), Some(l)) = (page, limit) {
            let skip = p.saturating_sub(1) * (l as u64);
            Some(
                FindOptions::builder()
                    .skip(skip)
                    .limit(l)
                    .sort(doc! { "created_at": -1 })
                    .build(),
            )
        } else {
            Some(FindOptions::builder().sort(doc! { "created_at": -1 }).build())
        };

        let mut cursor = self.collection.find(filter, options).await?;
        let mut list = Vec::new();

        while let Some(expense) = cursor.try_next().await? {
            list.push(expense);
        }

        Ok(list)
    }

    /// Get expenses within a date range
    pub async fn get_expenses_by_date_range(
        &self,
        start_date: DateTime,
        end_date: DateTime,
    ) -> mongodb::error::Result<Vec<Expense>> {
        let filter = doc! {
            "created_at": {
                "$gte": start_date,
                "$lte": end_date
            }
        };

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        let mut cursor = self.collection.find(filter, Some(options)).await?;
        let mut list = Vec::new();

        while let Some(expense) = cursor.try_next().await? {
            list.push(expense);
        }

        Ok(list)
    }

    /// Get a single expense by ID
    pub async fn get_expense_by_id(&self, id: &str) -> mongodb::error::Result<Option<Expense>> {
        let obj = match ObjectId::parse_str(id) {
            Ok(v) => v,
            Err(_) => return Ok(None),
        };

        let filter = doc! { "_id": obj };
        let data = self.collection.find_one(filter, None).await?;

        Ok(data)
    }

    /// Update an existing expense
    pub async fn update_expense(
        &self,
        id: &str,
        expense: Expense,
    ) -> mongodb::error::Result<Option<Expense>> {
        let obj = match ObjectId::parse_str(id) {
            Ok(v) => v,
            Err(_) => return Ok(None),
        };

        let filter = doc! { "_id": obj };

        // Serialize items to BSON
        let items_bson =
            mongodb::bson::to_bson(&expense.items).map_err(|e| mongodb::error::Error::custom(e))?;

        let update = doc! {
            "$set": {
                "expense_title": &expense.expense_title,
                "project_cost_center": &expense.project_cost_center,
                "items": items_bson,
                "total_amount": expense.total_amount,
                "updated_at": DateTime::now(),
            }
        };

        let result = self.collection.update_one(filter.clone(), update, None).await?;

        if result.modified_count > 0 || result.matched_count > 0 {
            // Fetch and return the updated document
            self.get_expense_by_id(id).await
        } else {
            Ok(None)
        }
    }

    /// Delete an expense by ID
    pub async fn delete_expense(&self, id: &str) -> mongodb::error::Result<bool> {
        let obj = match ObjectId::parse_str(id) {
            Ok(v) => v,
            Err(_) => return Ok(false),
        };

        let filter = doc! { "_id": obj };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    /// Get total count of expenses (useful for pagination)
    pub async fn count_expenses(&self) -> mongodb::error::Result<u64> {
        self.collection.count_documents(None, None).await
    }

    /// Get count of expenses by project
    pub async fn count_expenses_by_project(
        &self,
        project_cost_center: &str,
    ) -> mongodb::error::Result<u64> {
        let filter = doc! { "project_cost_center": project_cost_center };
        self.collection.count_documents(filter, None).await
    }

    /// Get total expense amount by project
    pub async fn get_total_amount_by_project(
        &self,
        project_cost_center: &str,
    ) -> mongodb::error::Result<f64> {
        let pipeline = vec![
            doc! {
                "$match": {
                    "project_cost_center": project_cost_center
                }
            },
            doc! {
                "$group": {
                    "_id": null,
                    "total": { "$sum": "$total_amount" }
                }
            },
        ];

        let mut cursor = self.collection.aggregate(pipeline, None).await?;

        if let Some(result) = cursor.try_next().await? {
            if let Ok(total) = result.get_f64("total") {
                return Ok(total);
            }
        }

        Ok(0.0)
    }

    /// Search expenses by title (case-insensitive)
    pub async fn search_expenses_by_title(
        &self,
        search_term: &str,
    ) -> mongodb::error::Result<Vec<Expense>> {
        let filter = doc! {
            "expense_title": {
                "$regex": search_term,
                "$options": "i" // case-insensitive
            }
        };

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        let mut cursor = self.collection.find(filter, Some(options)).await?;
        let mut list = Vec::new();

        while let Some(expense) = cursor.try_next().await? {
            list.push(expense);
        }

        Ok(list)
    }

    /// Get all unique project/cost centers
    pub async fn get_all_projects(&self) -> mongodb::error::Result<Vec<String>> {
        let distinct_results = self
            .collection
            .distinct("project_cost_center", None, None)
            .await?;

        let projects: Vec<String> = distinct_results
            .into_iter()
            .filter_map(|bson| bson.as_str().map(|s| s.to_string()))
            .collect();

        Ok(projects)
    }

    /// Get expense statistics summary
    pub async fn get_expense_summary(&self) -> mongodb::error::Result<ExpenseSummary> {
        let pipeline = vec![doc! {
            "$group": {
                "_id": null,
                "total_expenses": { "$sum": 1 },
                "total_amount": { "$sum": "$total_amount" },
                "avg_amount": { "$avg": "$total_amount" },
                "min_amount": { "$min": "$total_amount" },
                "max_amount": { "$max": "$total_amount" }
            }
        }];

        let mut cursor = self.collection.aggregate(pipeline, None).await?;

        if let Some(result) = cursor.try_next().await? {
            return Ok(ExpenseSummary {
                total_expenses: result.get_i32("total_expenses").unwrap_or(0) as u32,
                total_amount: result.get_f64("total_amount").unwrap_or(0.0),
                avg_amount: result.get_f64("avg_amount").unwrap_or(0.0),
                min_amount: result.get_f64("min_amount").unwrap_or(0.0),
                max_amount: result.get_f64("max_amount").unwrap_or(0.0),
            });
        }

        Ok(ExpenseSummary::default())
    }
}

/// Summary statistics for expenses
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ExpenseSummary {
    pub total_expenses: u32,
    pub total_amount: f64,
    pub avg_amount: f64,
    pub min_amount: f64,
    pub max_amount: f64,
}