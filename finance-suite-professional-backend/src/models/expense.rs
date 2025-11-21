use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

/// A single expense sub-item
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpenseItem {
    /// Category of expense (e.g., Travel, Food, Accommodation)
    pub expense_category: String,
    
    /// Currency code (e.g., INR, USD, EUR)
    pub currency: String,
    
    /// Amount for this expense item
    pub amount: f64,
    
    /// Date when the expense occurred (ISO format or any string format)
    pub expense_date: String,
    
    /// Additional notes or comments about this expense
    #[serde(default)]
    pub comment: String,

    /// Name of uploaded receipt file (stored on server)
    #[serde(default)]
    pub receipt_file: Option<String>,
    
    /// Original filename of the uploaded receipt
    #[serde(default)]
    pub original_filename: Option<String>,
    
    /// Payment method (e.g., Cash, Credit Card, Bank Transfer)
    #[serde(default)]
    pub payment_method: Option<String>,
    
    /// Vendor or merchant name
    #[serde(default)]
    pub vendor: Option<String>,
    
    /// Whether this item is billable to client
    #[serde(default)]
    pub billable: bool,
    
    /// Tax amount if applicable
    #[serde(default)]
    pub tax_amount: Option<f64>,
}

impl ExpenseItem {
    /// Validate the expense item
    pub fn validate(&self) -> Result<(), String> {
        if self.expense_category.trim().is_empty() {
            return Err("Expense category is required".to_string());
        }
        
        if self.currency.trim().is_empty() {
            return Err("Currency is required".to_string());
        }
        
        if self.amount < 0.0 {
            return Err("Amount cannot be negative".to_string());
        }
        
        if self.expense_date.trim().is_empty() {
            return Err("Expense date is required".to_string());
        }
        
        if let Some(tax) = self.tax_amount {
            if tax < 0.0 {
                return Err("Tax amount cannot be negative".to_string());
            }
        }
        
        Ok(())
    }
    
    /// Get total amount including tax
    pub fn total_with_tax(&self) -> f64 {
        self.amount + self.tax_amount.unwrap_or(0.0)
    }
}

/// Status of an expense report
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExpenseStatus {
    /// Expense is in draft state
    Draft,
    /// Submitted for approval
    Submitted,
    /// Approved by manager
    Approved,
    /// Rejected by manager
    Rejected,
    /// Reimbursement processed
    Reimbursed,
}

impl Default for ExpenseStatus {
    fn default() -> Self {
        ExpenseStatus::Draft
    }
}

/// Main Expense record
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    /// MongoDB _id
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    /// Title for this full expense report
    pub expense_title: String,

    /// Project / Cost Center
    pub project_cost_center: String,

    /// Multiple expense items
    #[serde(default)]
    pub items: Vec<ExpenseItem>,

    /// Total amount (calculated from items)
    #[serde(default)]
    pub total_amount: f64,
    
    /// Total tax amount across all items
    #[serde(default)]
    pub total_tax: f64,
    
    /// Status of the expense report
    #[serde(default)]
    pub status: ExpenseStatus,
    
    /// Employee/User who created the expense
    #[serde(default)]
    pub submitted_by: Option<String>,
    
    /// Manager/Approver ID
    #[serde(default)]
    pub approved_by: Option<String>,
    
    /// Date when submitted for approval
    #[serde(default)]
    pub submitted_at: Option<DateTime>,
    
    /// Date when approved/rejected
    #[serde(default)]
    pub reviewed_at: Option<DateTime>,
    
    /// Rejection reason if status is Rejected
    #[serde(default)]
    pub rejection_reason: Option<String>,
    
    /// Date when reimbursement was processed
    #[serde(default)]
    pub reimbursed_at: Option<DateTime>,
    
    /// Additional notes at expense report level
    #[serde(default)]
    pub notes: Option<String>,
    
    /// Department name
    #[serde(default)]
    pub department: Option<String>,

    /// When the expense was created
    #[serde(default)]
    pub created_at: Option<DateTime>,

    /// When the expense was last updated
    #[serde(default)]
    pub updated_at: Option<DateTime>,
}

impl Expense {
    /// Create a new expense with default values
    pub fn new(title: String, project_cost_center: String) -> Self {
        let now = DateTime::now();
        Self {
            id: None,
            expense_title: title,
            project_cost_center,
            items: Vec::new(),
            total_amount: 0.0,
            total_tax: 0.0,
            status: ExpenseStatus::Draft,
            submitted_by: None,
            approved_by: None,
            submitted_at: None,
            reviewed_at: None,
            rejection_reason: None,
            reimbursed_at: None,
            notes: None,
            department: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }
    
    /// Calculate total amount from all items
    pub fn calculate_total(&mut self) {
        self.total_amount = self.items.iter().map(|item| item.amount).sum();
        self.total_tax = self.items.iter().filter_map(|item| item.tax_amount).sum();
    }
    
    /// Get grand total including tax
    pub fn grand_total(&self) -> f64 {
        self.total_amount + self.total_tax
    }
    
    /// Validate the entire expense
    pub fn validate(&self) -> Result<(), String> {
        if self.expense_title.trim().is_empty() {
            return Err("Expense title is required".to_string());
        }
        
        if self.project_cost_center.trim().is_empty() {
            return Err("Project/Cost center is required".to_string());
        }
        
        if self.items.is_empty() {
            return Err("At least one expense item is required".to_string());
        }
        
        // Validate each item
        for (idx, item) in self.items.iter().enumerate() {
            if let Err(e) = item.validate() {
                return Err(format!("Item {}: {}", idx + 1, e));
            }
        }
        
        if self.total_amount < 0.0 {
            return Err("Total amount cannot be negative".to_string());
        }
        
        Ok(())
    }
    
    /// Check if expense can be edited (only if in Draft status)
    pub fn is_editable(&self) -> bool {
        self.status == ExpenseStatus::Draft
    }
    
    /// Check if expense can be submitted
    pub fn can_submit(&self) -> bool {
        self.status == ExpenseStatus::Draft && !self.items.is_empty()
    }
    
    /// Check if expense can be approved
    pub fn can_approve(&self) -> bool {
        self.status == ExpenseStatus::Submitted
    }
    
    /// Check if expense can be rejected
    pub fn can_reject(&self) -> bool {
        self.status == ExpenseStatus::Submitted
    }
    
    /// Submit the expense for approval
    pub fn submit(&mut self, user_id: String) -> Result<(), String> {
        if !self.can_submit() {
            return Err("Expense cannot be submitted in current status".to_string());
        }
        
        self.status = ExpenseStatus::Submitted;
        self.submitted_by = Some(user_id);
        self.submitted_at = Some(DateTime::now());
        self.updated_at = Some(DateTime::now());
        
        Ok(())
    }
    
    /// Approve the expense
    pub fn approve(&mut self, approver_id: String) -> Result<(), String> {
        if !self.can_approve() {
            return Err("Expense cannot be approved in current status".to_string());
        }
        
        self.status = ExpenseStatus::Approved;
        self.approved_by = Some(approver_id);
        self.reviewed_at = Some(DateTime::now());
        self.updated_at = Some(DateTime::now());
        
        Ok(())
    }
    
    /// Reject the expense
    pub fn reject(&mut self, approver_id: String, reason: String) -> Result<(), String> {
        if !self.can_reject() {
            return Err("Expense cannot be rejected in current status".to_string());
        }
        
        self.status = ExpenseStatus::Rejected;
        self.approved_by = Some(approver_id);
        self.reviewed_at = Some(DateTime::now());
        self.rejection_reason = Some(reason);
        self.updated_at = Some(DateTime::now());
        
        Ok(())
    }
    
    /// Mark as reimbursed
    pub fn mark_reimbursed(&mut self) -> Result<(), String> {
        if self.status != ExpenseStatus::Approved {
            return Err("Only approved expenses can be marked as reimbursed".to_string());
        }
        
        self.status = ExpenseStatus::Reimbursed;
        self.reimbursed_at = Some(DateTime::now());
        self.updated_at = Some(DateTime::now());
        
        Ok(())
    }
    
    /// Get all receipt filenames
    pub fn get_receipt_files(&self) -> Vec<String> {
        self.items
            .iter()
            .filter_map(|item| item.receipt_file.clone())
            .collect()
    }
    
    /// Count items by category
    pub fn count_by_category(&self) -> std::collections::HashMap<String, usize> {
        let mut map = std::collections::HashMap::new();
        for item in &self.items {
            *map.entry(item.expense_category.clone()).or_insert(0) += 1;
        }
        map
    }
    
    /// Get total amount by currency
    pub fn total_by_currency(&self) -> std::collections::HashMap<String, f64> {
        let mut map = std::collections::HashMap::new();
        for item in &self.items {
            *map.entry(item.currency.clone()).or_insert(0.0) += item.amount;
        }
        map
    }
}

/// Request to create a new expense
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateExpenseRequest {
    pub expense_title: String,
    pub project_cost_center: String,
    #[serde(default)]
    pub items: Vec<ExpenseItem>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
}

impl From<CreateExpenseRequest> for Expense {
    fn from(req: CreateExpenseRequest) -> Self {
        let now = DateTime::now();
        let mut expense = Expense {
            id: None,
            expense_title: req.expense_title,
            project_cost_center: req.project_cost_center,
            items: req.items,
            total_amount: 0.0,
            total_tax: 0.0,
            status: ExpenseStatus::Draft,
            submitted_by: None,
            approved_by: None,
            submitted_at: None,
            reviewed_at: None,
            rejection_reason: None,
            reimbursed_at: None,
            notes: req.notes,
            department: req.department,
            created_at: Some(now),
            updated_at: Some(now),
        };
        expense.calculate_total();
        expense
    }
}

/// Request to update an expense
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateExpenseRequest {
    #[serde(default)]
    pub expense_title: Option<String>,
    #[serde(default)]
    pub project_cost_center: Option<String>,
    #[serde(default)]
    pub items: Option<Vec<ExpenseItem>>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
}

/// Request to approve/reject an expense
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewExpenseRequest {
    pub action: ReviewAction,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ReviewAction {
    Approve,
    Reject,
}

/// Response with expense statistics
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpenseStats {
    pub total_count: usize,
    pub total_amount: f64,
    pub by_status: std::collections::HashMap<String, usize>,
    pub by_category: std::collections::HashMap<String, f64>,
}