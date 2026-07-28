use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub date: String,

    #[serde(default)]
    pub description: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub narration: String,

    #[serde(default)]
    pub reference: String,

    #[serde(default)]
    pub category: String,

    #[serde(default)]
    pub r#type: String,

    #[serde(default)]
    pub amount: f64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub debit: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub credit: Option<f64>,

    /// Foreign key → records collection
    #[serde(rename = "recordId", skip_serializing_if = "Option::is_none")]
    pub record_id: Option<ObjectId>,

    /// Denormalised title — copied from Record at insert time for easy display
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub title: String,

    /// Workflow status: "pending" | "reviewed" | "reconciled"
    #[serde(default = "default_status")]
    pub status: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub notes: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

fn default_status() -> String { "pending".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveTransactionsRequest {
    pub transactions: Vec<Transaction>,
    /// The record title — used to find-or-create the Record document
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotesRequest {
    pub notes: String,
    #[serde(default)]
    pub status: Option<String>,
}
