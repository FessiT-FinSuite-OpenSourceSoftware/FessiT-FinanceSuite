use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum GeneralExpenseStatus {
    Pending,
    Approved,
    Rejected,
    #[serde(other)]
    Unknown,
}

impl Default for GeneralExpenseStatus {
    fn default() -> Self {
        GeneralExpenseStatus::Pending
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralExpense {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        skip_deserializing
    )]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub title: String,

    #[serde(default)]
    pub category: String,

    #[serde(default)]
    pub date: String,

    #[serde(
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub amount: f64,

    /// Sub-total (amount + all GST)
    #[serde(
        rename = "subTotal",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub sub_total: f64,

    /// CGST component
    #[serde(
        rename = "total_cgst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_cgst: f64,

    /// SGST component
    #[serde(
        rename = "total_sgst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_sgst: f64,
    #[serde(default)]

    //billed 
    pub billed_to: Option<String>,
    
    /// IGST component
    #[serde(
        rename = "total_igst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_igst: f64,

    /// Total tax amount
    #[serde(default)]
    pub tax_amount: Option<f64>,

    #[serde(default)]
    pub paid_by: String,

    #[serde(default)]
    pub status: GeneralExpenseStatus,

    /// Date when the expense was approved (required when status = Approved)
    #[serde(default)]
    pub approved_date: Option<String>,

    /// Stored filename (UUID) of the uploaded document
    #[serde(default)]
    pub document: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

fn default_f64() -> f64 {
    0.0
}
fn deserialize_f64_or_string<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    use std::fmt;

    struct F64OrString;

    impl<'de> Visitor<'de> for F64OrString {
        type Value = f64;
        fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
            f.write_str("a number or a numeric string")
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<f64, E> {
            Ok(v)
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<f64, E> {
            Ok(v as f64)
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<f64, E> {
            Ok(v as f64)
        }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<f64, E> {
            if v.is_empty() {
                return Ok(0.0);
            }
            v.parse::<f64>().map_err(de::Error::custom)
        }
        fn visit_unit<E: de::Error>(self) -> Result<f64, E> {
            Ok(0.0)
        }
        fn visit_none<E: de::Error>(self) -> Result<f64, E> {
            Ok(0.0)
        }
        fn visit_some<D2: Deserializer<'de>>(self, d: D2) -> Result<f64, D2::Error> {
            Deserialize::deserialize(d)
        }
    }

    deserializer.deserialize_any(F64OrString)
}

pub type CreateGeneralExpenseRequest = GeneralExpense;
pub type UpdateGeneralExpenseRequest = GeneralExpense;
