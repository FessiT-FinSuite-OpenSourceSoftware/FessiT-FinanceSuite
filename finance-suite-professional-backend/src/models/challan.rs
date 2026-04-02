use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Challan {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Challan number (alphanumeric)
    #[serde(default)]
    pub challan_no: String,

    /// Section (e.g., "194C", "194J", "TDS on Salary")
    #[serde(default)]
    pub section: String,

    /// Payment date (YYYY-MM-DD)
    #[serde(default)]
    pub payment_date: String,

    /// Date of challan (YYYY-MM-DD)
    #[serde(default)]
    pub date_of_challan: String,

    /// Amount paid
    #[serde(default)]
    pub amount_paid: f64,

    /// Stored filename (UUID) of the uploaded challan file
    #[serde(default)]
    pub file: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

pub type CreateChallanRequest = Challan;
pub type UpdateChallanRequest = Challan;

