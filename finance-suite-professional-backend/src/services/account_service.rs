use std::sync::Arc;
use mongodb::bson::{oid::ObjectId, DateTime};

use crate::{
    models::account::{Account, AccountBalance, AccountType, OrganizationBalance},
    repository::account_repository::AccountRepository,
};

#[derive(Clone)]
pub struct AccountService {
    repo: Arc<AccountRepository>,
}

impl AccountService {
    pub fn new(repo: AccountRepository) -> Self {
        Self {
            repo: Arc::new(repo),
        }
    }

    /// Initialize default chart of accounts for a new organization
    pub async fn initialize_organization_accounts(
        &self,
        org_id: &ObjectId,
        created_by: Option<&ObjectId>,
    ) -> anyhow::Result<Vec<Account>> {
        self.repo
            .create_default_accounts(org_id, created_by)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create default accounts: {}", e))
    }

    /// Get all accounts for an organization
    pub async fn get_organization_accounts(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Account>> {
        self.repo
            .get_accounts_by_org(org_id)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get organization accounts: {}", e))
    }

    /// Get account by code within organization
    pub async fn get_account_by_code(
        &self,
        org_id: &ObjectId,
        account_code: &str,
    ) -> anyhow::Result<Option<Account>> {
        self.repo
            .get_account_by_code(org_id, account_code)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get account by code: {}", e))
    }

    /// Get organization balance summary
    pub async fn get_organization_balance(&self, org_id: &ObjectId) -> anyhow::Result<OrganizationBalance> {
        self.repo
            .get_organization_balance(org_id)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get organization balance: {}", e))
    }

    /// Get account balances by type
    pub async fn get_balances_by_type(
        &self,
        org_id: &ObjectId,
        account_type: &AccountType,
    ) -> anyhow::Result<Vec<AccountBalance>> {
        self.repo
            .get_balances_by_type(org_id, account_type)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get balances by type: {}", e))
    }

    /// Update account balance (used internally by ledger service)
    pub async fn update_account_balance(
        &self,
        account_id: &ObjectId,
        balance_delta: i64,
    ) -> anyhow::Result<()> {
        self.repo
            .update_account_balance(account_id, balance_delta)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to update account balance: {}", e))
    }

    /// Create a new account
    pub async fn create_account(&self, mut account: Account) -> anyhow::Result<Account> {
        let now = DateTime::now();
        account.created_at = now;
        account.updated_at = now;
        account.is_active = true;
        account.balance = 0; // New accounts start with zero balance

        self.repo
            .create_account(account)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create account: {}", e))
    }

    /// Get financial summary for organization
    pub async fn get_financial_summary(&self, org_id: &ObjectId) -> anyhow::Result<FinancialSummary> {
        let balance = self.get_organization_balance(org_id).await?;
        
        let assets = self.get_balances_by_type(org_id, &AccountType::Asset).await?;
        let liabilities = self.get_balances_by_type(org_id, &AccountType::Liability).await?;
        let equity = self.get_balances_by_type(org_id, &AccountType::Equity).await?;
        let revenue = self.get_balances_by_type(org_id, &AccountType::Revenue).await?;
        let expenses = self.get_balances_by_type(org_id, &AccountType::Expense).await?;

        Ok(FinancialSummary {
            organization_balance: balance,
            assets,
            liabilities,
            equity,
            revenue,
            expenses,
        })
    }
}

/// Complete financial summary for an organization
#[derive(Debug, serde::Serialize)]
pub struct FinancialSummary {
    #[serde(rename = "organizationBalance")]
    pub organization_balance: OrganizationBalance,
    pub assets: Vec<AccountBalance>,
    pub liabilities: Vec<AccountBalance>,
    pub equity: Vec<AccountBalance>,
    pub revenue: Vec<AccountBalance>,
    pub expenses: Vec<AccountBalance>,
}