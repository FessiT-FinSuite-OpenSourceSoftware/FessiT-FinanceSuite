use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PartyCounter {
    #[serde(rename = "_id")]
    pub party_id: ObjectId,

    /// Strict sequence for ordering ledger entries.
    pub sequence: i64,

    /// Current running balance in paise.
    pub balance: i64,

    /// Audit field.
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime,
}
