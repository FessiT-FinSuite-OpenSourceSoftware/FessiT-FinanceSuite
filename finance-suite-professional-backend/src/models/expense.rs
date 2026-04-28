use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CostType {
    Direct,
    Indirect,
}

impl Default for CostType {
    fn default() -> Self { CostType::Indirect }
}

/// Deserialise a field that may be stored as either a number or a string (legacy docs).
fn deserialize_f64_or_string<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    use std::fmt;

    struct F64OrString;

    impl<'de> Visitor<'de> for F64OrString {
        type Value = f64;
        fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
            f.write_str("a number or a numeric string")
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<f64, E> { Ok(v) }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<f64, E> { Ok(v as f64) }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<f64, E> { Ok(v as f64) }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<f64, E> {
            if v.is_empty() { return Ok(0.0); }
            v.parse::<f64>().map_err(de::Error::custom)
        }
        fn visit_unit<E: de::Error>(self) -> Result<f64, E> { Ok(0.0) }
        fn visit_none<E: de::Error>(self) -> Result<f64, E> { Ok(0.0) }
        fn visit_some<D2: Deserializer<'de>>(self, d: D2) -> Result<f64, D2::Error> {
            Deserialize::deserialize(d)
        }
    }

    deserializer.deserialize_any(F64OrString)
}

fn default_f64() -> f64 { 0.0 }

/// A single expense sub-item
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpenseItem {
    // ── Identity / classification ────────────────────────────────────────────

    /// Category of expense (e.g., Travel, Food, Accommodation)
    pub expense_category: String,

    /// Date when the expense occurred (ISO format or any string format)
    pub expense_date: String,

    /// Vendor or merchant name
    #[serde(default)]
    pub vendor: Option<String>,

    /// Payment method (e.g., Cash, Credit Card, Bank Transfer)
    #[serde(default)]
    pub payment_method: Option<String>,

    /// Whether this item is billable to client
    #[serde(default)]
    pub billable: bool,

     #[serde(default)]
    pub billed_to: Option<String>,

    // ── Amounts & tax ────────────────────────────────────────────────────────

    /// Currency code (e.g., INR, USD, EUR)
    pub currency: String,

    /// Base amount for this expense item (before tax)
    pub amount: f64,

    /// Sub-total (amount before GST, as received from frontend)
    #[serde(rename = "subTotal", default = "default_f64", deserialize_with = "deserialize_f64_or_string")]
    pub sub_total: f64,

    /// CGST component
    #[serde(default = "default_f64", deserialize_with = "deserialize_f64_or_string")]
    pub total_cgst: f64,

    /// SGST component
    #[serde(default = "default_f64", deserialize_with = "deserialize_f64_or_string")]
    pub total_sgst: f64,

    /// IGST component
    #[serde(default = "default_f64", deserialize_with = "deserialize_f64_or_string")]
    pub total_igst: f64,

    /// Total tax amount (CGST + SGST + IGST, or any other tax)
    #[serde(default)]
    pub tax_amount: Option<f64>,

    // ── Receipt / attachments ────────────────────────────────────────────────

    /// Name of uploaded receipt file (stored on server)
    #[serde(default)]
    pub receipt_file: Option<String>,

    /// Original filename of the uploaded receipt
    #[serde(default)]
    pub original_filename: Option<String>,

    // ── Misc ─────────────────────────────────────────────────────────────────

    /// Additional notes or comments about this expense
    #[serde(default)]
    pub comment: String,
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
    
    /// Get total amount including all GST components
    pub fn total_with_tax(&self) -> f64 {
        self.amount + self.total_cgst + self.total_sgst + self.total_igst
            + self.tax_amount.unwrap_or(0.0)
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

    /// Sum of all item base amounts (before GST)
    #[serde(default)]
    pub base_amount: f64,

    /// Grand total including GST (sum of all item sub_totals)
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
    pub reimbursed_at: Option<String>,
    
    /// Additional notes at expense report level
    #[serde(default)]
    pub notes: Option<String>,
    
    /// Department name
    #[serde(default)]
    pub department: Option<String>,

    /// User-entered submission date (e.g. "2026-03-30")
    #[serde(default)]
    pub submission_date: Option<String>,

    /// When the expense was created
    #[serde(default)]
    pub created_at: Option<DateTime>,

    /// When the expense was last updated
    #[serde(default)]
    pub updated_at: Option<DateTime>,

    /// Organisation reference
    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    #[serde(default)]
    pub cost_type: CostType,
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
            base_amount: 0.0,
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
            submission_date: None,
            created_at: Some(now),
            updated_at: Some(now),
            organisation_id: None,
            cost_type: CostType::Indirect,
        }
    }
    
    /// Calculate all totals from items
    pub fn calculate_total(&mut self) {
        // Recompute sub_total and tax_amount on each item from GST components
        for item in self.items.iter_mut() {
            let gst = item.total_cgst + item.total_sgst + item.total_igst;
            item.tax_amount = Some(gst);
            item.sub_total = item.amount + gst;
        }
        self.base_amount = self.items.iter().map(|item| item.amount).sum();
        self.total_tax = self.items.iter().map(|item| {
            item.total_cgst + item.total_sgst + item.total_igst
        }).sum();
        self.total_amount = self.items.iter().map(|item| item.sub_total).sum();
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
        self.reimbursed_at = None;
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
            base_amount: 0.0,
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
            submission_date: None,
            created_at: Some(now),
            updated_at: Some(now),
            organisation_id: None,
            cost_type: CostType::Indirect,
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