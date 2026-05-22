use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct TdsSection {
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub section_new: String,
    #[serde(default)]
    pub section_old: String,
    #[serde(default)]
    pub nature: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Challan {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Challan number (alphanumeric)
    #[serde(default)]
    pub challan_no: String,

    /// One or more TDS sections
    #[serde(default)]
    pub tds_sections: Vec<TdsSection>,

    /// Payment date (YYYY-MM-DD)
    #[serde(default)]
    pub payment_date: String,

    /// Date of challan (YYYY-MM-DD)
    #[serde(default)]
    pub date_of_challan: String,

    /// Amount paid
    #[serde(default)]
    pub amount_paid: f64,

    /// Financial year (e.g., "2024-25")
    #[serde(default)]
    pub tax_year: String,

    /// Type of payment (e.g., "TDS/TCS payable by taxpayer")
    #[serde(default)]
    pub payment_type: String,

    /// Bank reference number
    #[serde(default)]
    pub bank_reference_no: String,

    /// Stored filename (UUID) of the uploaded challan file
    #[serde(default)]
    pub file: String,

    /// Mode of payment (e.g., "Online", "Cheque", "NEFT")
    #[serde(default)]
    pub mode_of_payment: String,

    /// Additional notes
    #[serde(default)]
    pub notes: String,

    /// Period for the challan (e.g., "2025-04" for April 2025)
    #[serde(default)]
    pub period: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]    pub organisation_id: Option<ObjectId>,
}

pub type CreateChallanRequest = Challan;
pub type UpdateChallanRequest = Challan;

