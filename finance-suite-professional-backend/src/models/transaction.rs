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

    #[serde(default)]
    pub reference: String,

    #[serde(default)]
    pub category: String,

    #[serde(default)]
    pub r#type: String,   // "Credit" | "Debit"

    #[serde(default)]
    pub amount: f64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance: Option<f64>,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveTransactionsRequest {
    pub transactions: Vec<Transaction>,
}
