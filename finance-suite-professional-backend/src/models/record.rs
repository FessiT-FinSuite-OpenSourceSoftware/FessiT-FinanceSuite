use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Record {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    pub title: String,

    /// Unix ms timestamp — set once on creation
    pub created_at: i64,

    /// Manual review status: "notreviewed" | "accepted" | "rejected"
    #[serde(default = "default_record_status")]
    pub status: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub notes: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

fn default_record_status() -> String { "notreviewed".to_string() }

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRecordStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRecordNotesRequest {
    pub notes: String,
}
