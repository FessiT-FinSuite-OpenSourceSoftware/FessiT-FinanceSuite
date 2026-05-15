use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Challan {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Challan number (alphanumeric)
    #[serde(default)]
    pub challan_no: String,

    /// Old section code (e.g., "194C") — stored for display/filter
    #[serde(default)]
    pub section: String,

    /// Numeric code key from TDS_FLAT_LIST (e.g., "1023")
    #[serde(default)]
    pub tds_section_key: String,

    /// New section reference (e.g., "393(1)[Sl.6(i).D(a)]")
    #[serde(default)]
    pub tds_section_new: String,

    /// Old section reference (e.g., "194C")
    #[serde(default)]
    pub tds_section_old: String,

    /// Nature of payment description
    #[serde(default)]
    pub tds_section_nature: String,

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

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

pub type CreateChallanRequest = Challan;
pub type UpdateChallanRequest = Challan;

