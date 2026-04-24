use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

/// Type-safe ledger entry classification.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntryType {
    OpeningBalance,
    Invoice,
    Payment,
    CreditNote,
    DebitNote,
    Adjustment,
    Reversal,
}

/// Core ledger entry model.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Organization scope for multi-tenant isolation.
    #[serde(rename = "organisationId")]
    pub organisation_id: ObjectId,

    /// Who this ledger belongs to (customer/vendor).
    #[serde(rename = "partyId")]
    pub party_id: ObjectId,

    /// Business date selected by the user.
    pub date: DateTime,

    /// System timestamp used for audit and fallback ordering.
    #[serde(rename = "createdAt")]
    pub created_at: DateTime,

    /// Strict ordering per party.
    pub sequence: i64,

    /// Type of entry.
    #[serde(rename = "entryType")]
    pub entry_type: EntryType,

    /// Reference to source document.
    #[serde(rename = "referenceId", skip_serializing_if = "Option::is_none", default)]
    pub reference_id: Option<ObjectId>,

    #[serde(rename = "referenceNumber", skip_serializing_if = "Option::is_none", default)]
    pub reference_number: Option<String>,

    /// Snapshot preserved for historical correctness.
    #[serde(rename = "partyNameSnapshot", skip_serializing_if = "Option::is_none", default)]
    pub party_name_snapshot: Option<String>,

    /// Description for UI / PDF.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,

    /// Transaction currency.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub currency: Option<String>,

    /// Original foreign currency amount (same as credit/debit if domestic).
    #[serde(rename = "foreignAmount", skip_serializing_if = "Option::is_none", default)]
    pub foreign_amount: Option<i64>,

    /// Conversion rate used at time of payment (1 foreign unit = X INR).
    #[serde(rename = "conversionRate", skip_serializing_if = "Option::is_none", default)]
    pub conversion_rate: Option<f64>,

    /// Financial values in base currency (INR).
    pub debit: i64,
    pub credit: i64,

    /// Running balance after this entry.
    pub balance: i64,

    /// Optional metadata.
    #[serde(rename = "paymentMethod", skip_serializing_if = "Option::is_none", default)]
    pub payment_method: Option<String>,

    #[serde(rename = "paymentType", skip_serializing_if = "Option::is_none", default)]
    pub payment_type: Option<String>,

    #[serde(rename = "paymentReference", skip_serializing_if = "Option::is_none", default)]
    pub payment_reference: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<String>,

    /// Audit tracking.
    #[serde(rename = "createdBy", skip_serializing_if = "Option::is_none", default)]
    pub created_by: Option<ObjectId>,

    /// Reversal tracking instead of delete.
    #[serde(rename = "isReversed", skip_serializing_if = "Option::is_none", default)]
    pub is_reversed: Option<bool>,

    #[serde(rename = "reversedBy", skip_serializing_if = "Option::is_none", default)]
    pub reversed_by: Option<ObjectId>,

    /// Internal idempotency key to make retries safe.
    #[serde(rename = "idempotencyKey", skip_serializing_if = "Option::is_none", default)]
    pub idempotency_key: Option<String>,
}

pub type LedgerEntryType = EntryType;
