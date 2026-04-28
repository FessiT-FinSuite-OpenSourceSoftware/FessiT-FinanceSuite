use std::sync::Arc;

use mongodb::bson::{oid::ObjectId, DateTime};

use crate::{
    models::ledger::{EntryType, LedgerEntry},
    repository::ledger_repository::{LedgerQuery, LedgerRepository, LedgerResult},
    repository::customer_repository::CustomerRepository,
    repository::user_repository::UserRepository,
    repository::account_repository::AccountRepository,
    models::account::AccountType,
};

#[derive(Clone)]
pub struct LedgerService {
    repo: Arc<LedgerRepository>,
    user_repo: Arc<UserRepository>,
    customer_repo: Arc<CustomerRepository>,
    account_repo: Arc<AccountRepository>,
}

impl LedgerService {
    pub fn new(repo: LedgerRepository, user_repo: UserRepository, customer_repo: CustomerRepository, account_repo: AccountRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
            customer_repo: Arc::new(customer_repo),
            account_repo: Arc::new(account_repo),
        }
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<crate::models::users::User> {
        self.user_repo
            .get_user_by_id(user_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))
    }

    fn to_smallest_unit(amount: f64) -> anyhow::Result<i64> {
        if !amount.is_finite() {
            return Err(anyhow::anyhow!("Amount must be a finite number"));
        }
        let paise = (amount * 100.0).round();
        if paise < i64::MIN as f64 || paise > i64::MAX as f64 {
            return Err(anyhow::anyhow!("Amount is out of range"));
        }
        Ok(paise as i64)
    }

    fn matches_party_name(candidate: &crate::models::Customer, party_name_snapshot: &str) -> bool {
        fn normalize(value: &str) -> String {
            value
                .trim()
                .chars()
                .filter(|ch| ch.is_ascii_alphanumeric() || ch.is_whitespace())
                .collect::<String>()
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
                .to_ascii_lowercase()
        }

        let candidate_name = normalize(&candidate.customer_name);
        let company_name = normalize(&candidate.company_name);
        let snapshot = normalize(party_name_snapshot);

        candidate_name == snapshot || company_name == snapshot
    }

    async fn resolve_party_id(
        &self,
        org_id: &ObjectId,
        customer_id: Option<&ObjectId>,
        party_name_snapshot: &str,
    ) -> anyhow::Result<ObjectId> {
        if let Some(id) = customer_id {
            return Ok(*id);
        }

        let customers = self
            .customer_repo
            .find_by_organisation(org_id)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to resolve customer: {}", e))?;

        if let Some(customer) = customers
            .into_iter()
            .find(|customer| Self::matches_party_name(customer, party_name_snapshot))
        {
            return customer
                .id
                .ok_or_else(|| anyhow::anyhow!("Matched customer is missing an id"));
        }

        Err(anyhow::anyhow!(
            "Could not resolve party_id for ledger entry: no customer matched name '{}' in org {}",
            party_name_snapshot, org_id
        ))
    }

    async fn build_ledger_entry(
        &self,
        entry_type: EntryType,
        invoice_id: &ObjectId,
        invoice_number: &str,
        customer_id: Option<&ObjectId>,
        party_name_snapshot: &str,
        amount: f64,
        currency: &str,
        org_id: &ObjectId,
        event_date: DateTime,
        payment_method: Option<&str>,
        status: Option<&str>,
        created_by: Option<&ObjectId>,
    ) -> anyhow::Result<LedgerEntry> {
        let amount_paise = Self::to_smallest_unit(amount)?;
        let now = DateTime::now();
        let party_id = self
            .resolve_party_id(org_id, customer_id, party_name_snapshot)
            .await?;

        let (debit, credit, description, idempotency_key, status_value) = match entry_type {
            EntryType::Invoice => (
                amount_paise,
                0,
                Some(format!("Invoice issued for invoice {}", invoice_number)),
                Some(format!("invoice_issued:{}", invoice_id.to_hex())),
                status.map(|value| value.to_string()).or_else(|| Some("issued".to_string())),
            ),
            EntryType::Payment => (
                amount_paise, // debit = payment reduces customer debt
                0,
                Some(format!("Payment received for invoice {}", invoice_number)),
                Some(format!("invoice_paid:{}", invoice_id.to_hex())),
                status.map(|value| value.to_string()).or_else(|| Some("cleared".to_string())),
            ),
            _ => (
                amount_paise,
                0,
                Some(format!("Ledger entry for invoice {}", invoice_number)),
                Some(format!("invoice_ledger:{}", invoice_id.to_hex())),
                status.map(|value| value.to_string()),
            ),
        };

        Ok(LedgerEntry {
            id: None,
            organisation_id: *org_id,
            party_id,
            date: event_date,
            created_at: now,
            sequence: 0,
            entry_type,
            reference_id: Some(*invoice_id),
            reference_number: Some(invoice_number.to_string()),
            party_name_snapshot: Some(party_name_snapshot.to_string()),
            description,
            currency: Some(currency.to_string()),
            foreign_amount: None,
            conversion_rate: None,
            debit,
            credit,
            balance: 0,
            payment_method: payment_method.map(|value| value.to_string()),
            payment_type: None,
            payment_reference: None,
            status: status_value,
            created_by: created_by.copied(),
            is_reversed: Some(false),
            reversed_by: None,
            idempotency_key,
        })
    }

    /// Record an issued invoice in the party ledger.
    pub async fn record_invoice_issue(
        &self,
        invoice_id: &ObjectId,
        invoice_number: &str,
        customer_id: Option<&ObjectId>,
        party_name_snapshot: &str,
        amount: f64,
        currency: &str,
        org_id: &ObjectId,
        invoice_date: DateTime,
        status: Option<&str>,
        created_by: Option<&ObjectId>,
    ) -> anyhow::Result<LedgerEntry> {
        let entry = self
            .build_ledger_entry(
                EntryType::Invoice,
                invoice_id,
                invoice_number,
                customer_id,
                party_name_snapshot,
                amount,
                currency,
                org_id,
                invoice_date,
                None,
                status,
                created_by,
            )
            .await?;

        Ok(self.repo.record_entry(entry).await?)
    }

    /// Record a payment received against an invoice.
    pub async fn record_invoice_payment(
        &self,
        invoice_id: &ObjectId,
        invoice_number: &str,
        customer_id: Option<&ObjectId>,
        party_name_snapshot: &str,
        foreign_amount: f64,
        currency: &str,
        conversion_rate: f64,
        org_id: &ObjectId,
        payment_date: DateTime,
        payment_method: Option<&str>,
        payment_type: Option<&str>,
        payment_reference: Option<&str>,
        created_by: Option<&ObjectId>,
    ) -> anyhow::Result<LedgerEntry> {
        // INR equivalent = foreign amount * conversion rate (1.0 for domestic INR)
        let inr_amount = foreign_amount * conversion_rate;
        let inr_units = Self::to_smallest_unit(inr_amount)?;
        let foreign_units = Self::to_smallest_unit(foreign_amount)?;

        let now = DateTime::now();
        let party_id = self
            .resolve_party_id(org_id, customer_id, party_name_snapshot)
            .await
            .unwrap_or(*org_id);

        let entry = LedgerEntry {
            id: None,
            organisation_id: *org_id,
            party_id,
            date: payment_date,
            created_at: now,
            sequence: 0,
            entry_type: EntryType::Payment,
            reference_id: Some(*invoice_id),
            reference_number: Some(invoice_number.to_string()),
            party_name_snapshot: Some(party_name_snapshot.to_string()),
            description: Some(format!("Payment received for invoice {}", invoice_number)),
            currency: Some(currency.to_string()),
            foreign_amount: if conversion_rate != 1.0 { Some(foreign_units) } else { None },
            conversion_rate: if conversion_rate != 1.0 { Some(conversion_rate) } else { None },
            debit: 0,
            credit: inr_units,
            balance: 0,
            payment_method: payment_method.map(|v| v.to_string()),
            payment_type: payment_type.map(|v| v.to_string()),
            payment_reference: payment_reference.map(|v| v.to_string()),
            status: Some("cleared".to_string()),
            created_by: created_by.copied(),
            is_reversed: Some(false),
            reversed_by: None,
            idempotency_key: Some(format!("invoice_paid:{}", invoice_id.to_hex())),
        };

        let recorded_entry = self.repo.record_entry(entry).await?;
        
        // Update account balances for double-entry bookkeeping
        self.update_account_balances_for_payment(org_id, inr_units).await?;
        
        Ok(recorded_entry)
    }

    /// Update account balances when a payment is received
    async fn update_account_balances_for_payment(
        &self,
        org_id: &ObjectId,
        amount_paise: i64,
    ) -> anyhow::Result<()> {
        // Debit: Cash (Asset increases)
        if let Some(cash_account) = self.account_repo.get_account_by_code(org_id, "1001").await? {
            if let Some(cash_id) = cash_account.id {
                self.account_repo.update_account_balance(&cash_id, amount_paise).await?; // Debit increases asset
            }
        }
        
        // Credit: Accounts Receivable (Asset decreases)
        if let Some(ar_account) = self.account_repo.get_account_by_code(org_id, "1002").await? {
            if let Some(ar_id) = ar_account.id {
                self.account_repo.update_account_balance(&ar_id, -amount_paise).await?; // Credit decreases asset
            }
        }
        
        Ok(())
    }

    /// Get organization-level balance summary
    pub async fn get_organization_balance_summary(
        &self,
        org_id: &ObjectId,
    ) -> anyhow::Result<crate::models::account::OrganizationBalance> {
        self.account_repo
            .get_organization_balance(org_id)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get organization balance: {}", e))
    }

    /// Get account balances by type for an organization
    pub async fn get_account_balances_by_type(
        &self,
        org_id: &ObjectId,
        account_type: &AccountType,
    ) -> anyhow::Result<Vec<crate::models::account::AccountBalance>> {
        self.account_repo
            .get_balances_by_type(org_id, account_type)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get account balances: {}", e))
    }

    /// Record a payment made for an incoming invoice (debit — balance decreases).
    pub async fn record_incoming_invoice_payment(
        &self,
        invoice_id: &ObjectId,
        invoice_number: &str,
        vendor_name: &str,
        vendor_id: Option<&ObjectId>,
        amount: f64,
        currency: &str,
        org_id: &ObjectId,
        payment_date: DateTime,
        created_by: Option<&ObjectId>,
    ) -> anyhow::Result<LedgerEntry> {
        let amount_paise = Self::to_smallest_unit(amount)?;
        let now = DateTime::now();

        // Use vendor_id directly if present, else try name-match, else fall back to org_id
        let party_id = if let Some(vid) = vendor_id {
            *vid
        } else {
            self.resolve_party_id(org_id, None, vendor_name).await.unwrap_or(*org_id)
        };

        let entry = LedgerEntry {
            id: None,
            organisation_id: *org_id,
            party_id,
            date: payment_date,
            created_at: now,
            sequence: 0,
            entry_type: EntryType::Payment,
            reference_id: Some(*invoice_id),
            reference_number: Some(invoice_number.to_string()),
            party_name_snapshot: Some(vendor_name.to_string()),
            description: Some(format!("Payment made for incoming invoice {}", invoice_number)),
            currency: Some(currency.to_string()),
            foreign_amount: None,
            conversion_rate: None,
            debit: amount_paise,
            credit: 0,
            balance: 0,
            payment_method: None,
            payment_type: None,
            payment_reference: None,
            status: Some("cleared".to_string()),
            created_by: created_by.copied(),
            is_reversed: Some(false),
            reversed_by: None,
            idempotency_key: Some(format!("incoming_invoice_paid:{}", invoice_id.to_hex())),
        };

        let recorded_entry = self.repo.record_entry(entry).await?;

        // Decrease Cash account (1001) — we paid out money
        if let Some(cash_account) = self.account_repo.get_account_by_code(org_id, "1001").await? {
            if let Some(cash_id) = cash_account.id {
                self.account_repo.update_account_balance(&cash_id, -amount_paise).await?;
            }
        }

        Ok(recorded_entry)
    }

    pub async fn query(
        &self,
        org_id: &ObjectId,
        party_id: Option<ObjectId>,
        from: Option<String>,
        to: Option<String>,
        page: Option<u64>,
        limit: Option<i64>,
    ) -> anyhow::Result<LedgerResult> {
        Ok(self
            .repo
            .query(
                org_id,
                LedgerQuery {
                    party_id,
                    from,
                    to,
                    page,
                    limit,
                },
            )
            .await?)
    }
}
