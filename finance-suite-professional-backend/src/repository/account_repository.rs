use std::sync::Arc;
use futures::stream::TryStreamExt;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, DateTime, Document},
    error::Error as MongoError,
    options::{FindOptions, IndexOptions, UpdateOptions},
    Client, Collection, IndexModel,
};

use crate::models::account::{Account, AccountBalance, AccountType, OrganizationBalance};

#[derive(Clone)]
pub struct AccountRepository {
    client: Arc<Client>,
    collection: Arc<Collection<Account>>,
    raw_collection: Arc<Collection<Document>>,
}

impl AccountRepository {
    pub fn new(client: Client, collection: Collection<Account>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            client: Arc::new(client),
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    /// Ensure indexes for account management
    pub async fn ensure_indexes(&self) -> Result<(), MongoError> {
        let unique_account_code_index = IndexModel::builder()
            .keys(doc! { "organisationId": 1, "accountCode": 1 })
            .options(
                IndexOptions::builder()
                    .unique(true)
                    .name("unique_org_account_code".to_string())
                    .build(),
            )
            .build();

        let org_type_index = IndexModel::builder()
            .keys(doc! { "organisationId": 1, "accountType": 1 })
            .options(
                IndexOptions::builder()
                    .name("org_account_type".to_string())
                    .build(),
            )
            .build();

        self.collection
            .create_indexes(vec![unique_account_code_index, org_type_index], None)
            .await?;
        Ok(())
    }

    /// Create default chart of accounts for a new organization
    pub async fn create_default_accounts(&self, org_id: &ObjectId, created_by: Option<&ObjectId>) -> Result<Vec<Account>, MongoError> {
        let now = DateTime::now();
        let default_accounts = vec![
            // Assets
            Account {
                id: None,
                organisation_id: *org_id,
                account_code: "1001".to_string(),
                account_name: "Cash".to_string(),
                account_type: AccountType::Asset,
                account_category: crate::models::account::AccountCategory::CurrentAssets,
                parent_account_id: None,
                is_active: true,
                balance: 0,
                description: Some("Cash on hand and in bank".to_string()),
                created_at: now,
                updated_at: now,
                created_by: created_by.copied(),
            },
            Account {
                id: None,
                organisation_id: *org_id,
                account_code: "1002".to_string(),
                account_name: "Accounts Receivable".to_string(),
                account_type: AccountType::Asset,
                account_category: crate::models::account::AccountCategory::CurrentAssets,
                parent_account_id: None,
                is_active: true,
                balance: 0,
                description: Some("Money owed by customers".to_string()),
                created_at: now,
                updated_at: now,
                created_by: created_by.copied(),
            },
            // Liabilities
            Account {
                id: None,
                organisation_id: *org_id,
                account_code: "2001".to_string(),
                account_name: "Accounts Payable".to_string(),
                account_type: AccountType::Liability,
                account_category: crate::models::account::AccountCategory::CurrentLiabilities,
                parent_account_id: None,
                is_active: true,
                balance: 0,
                description: Some("Money owed to suppliers".to_string()),
                created_at: now,
                updated_at: now,
                created_by: created_by.copied(),
            },
            // Revenue
            Account {
                id: None,
                organisation_id: *org_id,
                account_code: "4001".to_string(),
                account_name: "Sales Revenue".to_string(),
                account_type: AccountType::Revenue,
                account_category: crate::models::account::AccountCategory::OperatingRevenue,
                parent_account_id: None,
                is_active: true,
                balance: 0,
                description: Some("Revenue from sales".to_string()),
                created_at: now,
                updated_at: now,
                created_by: created_by.copied(),
            },
            // Expenses
            Account {
                id: None,
                organisation_id: *org_id,
                account_code: "5001".to_string(),
                account_name: "Operating Expenses".to_string(),
                account_type: AccountType::Expense,
                account_category: crate::models::account::AccountCategory::OperatingExpenses,
                parent_account_id: None,
                is_active: true,
                balance: 0,
                description: Some("General operating expenses".to_string()),
                created_at: now,
                updated_at: now,
                created_by: created_by.copied(),
            },
        ];

        let result = self.collection.insert_many(&default_accounts, None).await?;
        let mut created_accounts = default_accounts;
        
        // Set the IDs from the insert result
        for (i, id) in result.inserted_ids.iter().enumerate() {
            if let Some(oid) = id.1.as_object_id() {
                created_accounts[i].id = Some(oid);
            }
        }

        Ok(created_accounts)
    }

    /// Get all accounts for an organization
    pub async fn get_accounts_by_org(&self, org_id: &ObjectId) -> Result<Vec<Account>, MongoError> {
        let filter = doc! { "organisationId": org_id, "isActive": true };
        let options = FindOptions::builder()
            .sort(doc! { "accountCode": 1 })
            .build();

        let mut cursor = self.collection.find(filter, options).await?;
        let mut accounts = Vec::new();
        
        while let Some(account) = cursor.try_next().await? {
            accounts.push(account);
        }

        Ok(accounts)
    }

    /// Get account by code within organization
    pub async fn get_account_by_code(&self, org_id: &ObjectId, account_code: &str) -> Result<Option<Account>, MongoError> {
        let filter = doc! { 
            "organisationId": org_id, 
            "accountCode": account_code,
            "isActive": true 
        };
        self.collection.find_one(filter, None).await
    }

    /// Update account balance
    pub async fn update_account_balance(&self, account_id: &ObjectId, balance_delta: i64) -> Result<(), MongoError> {
        let filter = doc! { "_id": account_id };
        let update = doc! { 
            "$inc": { "balance": balance_delta },
            "$set": { "updatedAt": DateTime::now() }
        };
        
        self.collection.update_one(filter, update, None).await?;
        Ok(())
    }

    /// Get account balances by type for an organization
    pub async fn get_balances_by_type(&self, org_id: &ObjectId, account_type: &AccountType) -> Result<Vec<AccountBalance>, MongoError> {
        let account_type_str = match account_type {
            AccountType::Asset => "asset",
            AccountType::Liability => "liability",
            AccountType::Equity => "equity",
            AccountType::Revenue => "revenue",
            AccountType::Expense => "expense",
        };
        
        let filter = doc! { 
            "organisationId": org_id, 
            "accountType": account_type_str,
            "isActive": true 
        };
        let options = FindOptions::builder()
            .sort(doc! { "accountCode": 1 })
            .build();

        let mut cursor = self.raw_collection.find(filter, options).await?;
        let mut balances = Vec::new();

        while let Some(doc) = cursor.try_next().await? {
            if let Ok(account) = from_document::<Account>(doc) {
                balances.push(AccountBalance {
                    account_id: account.id.unwrap_or_else(|| ObjectId::new()),
                    account_code: account.account_code,
                    account_name: account.account_name,
                    account_type: account.account_type,
                    account_category: account.account_category,
                    balance: account.balance,
                    balance_formatted: account.balance as f64 / 100.0,
                });
            }
        }

        Ok(balances)
    }

    /// Get organization balance summary
    pub async fn get_organization_balance(&self, org_id: &ObjectId) -> Result<OrganizationBalance, MongoError> {
        let pipeline = vec![
            doc! { "$match": { "organisationId": org_id, "isActive": true } },
            doc! { 
                "$group": {
                    "_id": "$accountType",
                    "totalBalance": { "$sum": "$balance" }
                }
            }
        ];

        let mut cursor = self.raw_collection.aggregate(pipeline, None).await?;
        let mut totals = std::collections::HashMap::new();

        while let Some(doc) = cursor.try_next().await? {
            if let (Ok(account_type), Ok(balance)) = (
                doc.get_str("_id"),
                doc.get_i64("totalBalance")
            ) {
                totals.insert(account_type.to_string(), balance);
            }
        }

        let total_assets = totals.get("asset").copied().unwrap_or(0);
        let total_liabilities = totals.get("liability").copied().unwrap_or(0);
        let total_equity = totals.get("equity").copied().unwrap_or(0);
        let total_revenue = totals.get("revenue").copied().unwrap_or(0);
        let total_expenses = totals.get("expense").copied().unwrap_or(0);

        Ok(OrganizationBalance {
            organisation_id: *org_id,
            total_assets,
            total_liabilities,
            total_equity,
            total_revenue,
            total_expenses,
            net_income: total_revenue - total_expenses,
            updated_at: DateTime::now(),
        })
    }

    /// Create a new account
    pub async fn create_account(&self, account: Account) -> Result<Account, MongoError> {
        let result = self.collection.insert_one(&account, None).await?;
        let mut created_account = account;
        if let Some(id) = result.inserted_id.as_object_id() {
            created_account.id = Some(id);
        }
        Ok(created_account)
    }
}