use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

/// Standard account types for financial reporting
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccountType {
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense,
}

/// Account categories for better organization
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccountCategory {
    // Assets
    CurrentAssets,
    FixedAssets,
    // Liabilities
    CurrentLiabilities,
    LongTermLiabilities,
    // Equity
    OwnersEquity,
    RetainedEarnings,
    // Revenue
    OperatingRevenue,
    NonOperatingRevenue,
    // Expenses
    OperatingExpenses,
    NonOperatingExpenses,
}

/// Chart of accounts per organization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    /// Organization scope
    #[serde(rename = "organisationId")]
    pub organisation_id: ObjectId,

    /// Account code (e.g., "1001", "2001")
    #[serde(rename = "accountCode")]
    pub account_code: String,

    /// Account name (e.g., "Cash", "Accounts Receivable")
    #[serde(rename = "accountName")]
    pub account_name: String,

    /// Account type for financial statements
    #[serde(rename = "accountType")]
    pub account_type: AccountType,

    /// Account category for sub-classification
    #[serde(rename = "accountCategory")]
    pub account_category: AccountCategory,

    /// Parent account for hierarchical structure
    #[serde(rename = "parentAccountId", skip_serializing_if = "Option::is_none")]
    pub parent_account_id: Option<ObjectId>,

    /// Whether this account is active
    #[serde(rename = "isActive")]
    pub is_active: bool,

    /// Current balance in paise (base currency)
    pub balance: i64,

    /// Description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Audit fields
    #[serde(rename = "createdAt")]
    pub created_at: DateTime,

    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime,

    #[serde(rename = "createdBy", skip_serializing_if = "Option::is_none")]
    pub created_by: Option<ObjectId>,
}

/// Organization-level balance summary
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrganizationBalance {
    #[serde(rename = "organisationId")]
    pub organisation_id: ObjectId,

    /// Total assets in paise
    #[serde(rename = "totalAssets")]
    pub total_assets: i64,

    /// Total liabilities in paise
    #[serde(rename = "totalLiabilities")]
    pub total_liabilities: i64,

    /// Total equity in paise
    #[serde(rename = "totalEquity")]
    pub total_equity: i64,

    /// Total revenue in paise
    #[serde(rename = "totalRevenue")]
    pub total_revenue: i64,

    /// Total expenses in paise
    #[serde(rename = "totalExpenses")]
    pub total_expenses: i64,

    /// Net income (revenue - expenses)
    #[serde(rename = "netIncome")]
    pub net_income: i64,

    /// Last updated
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime,
}

/// Account balance with details
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountBalance {
    #[serde(rename = "accountId")]
    pub account_id: ObjectId,

    #[serde(rename = "accountCode")]
    pub account_code: String,

    #[serde(rename = "accountName")]
    pub account_name: String,

    #[serde(rename = "accountType")]
    pub account_type: AccountType,

    #[serde(rename = "accountCategory")]
    pub account_category: AccountCategory,

    /// Current balance in paise
    pub balance: i64,

    /// Balance in major currency units (for display)
    #[serde(rename = "balanceFormatted")]
    pub balance_formatted: f64,
}