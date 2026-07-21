use mongodb::bson::{oid::ObjectId, Bson};
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CostType {
    Direct,
    Indirect,
}

impl Default for CostType {
    fn default() -> Self { CostType::Indirect }
}

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

fn deserialize_optional_oid<'de, D>(deserializer: D) -> Result<Option<ObjectId>, D::Error>
where
    D: Deserializer<'de>,
{
    match Bson::deserialize(deserializer)? {
        Bson::ObjectId(oid) => Ok(Some(oid)),
        Bson::String(s) if !s.is_empty() =>
            ObjectId::parse_str(&s).map(Some).map_err(serde::de::Error::custom),
        _ => Ok(None),
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

    #[serde(
        rename = "subTotal",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub sub_total: f64,

    #[serde(
        rename = "total_cgst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_cgst: f64,

    #[serde(
        rename = "total_sgst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_sgst: f64,

    #[serde(default)]
    pub billed_to: Option<String>,

    #[serde(
        rename = "total_igst",
        default = "default_f64",
        deserialize_with = "deserialize_f64_or_string"
    )]
    pub total_igst: f64,

    #[serde(default)]
    pub tax_amount: Option<f64>,

    /// Legacy plain-text paid_by — kept for backward compat with old documents.
    /// New records set this to the resolved employee name at write time.
    #[serde(default)]
    pub paid_by: String,

    /// FK reference to an Employee document. Optional so old records without
    /// this field deserialize cleanly (defaults to None).
    #[serde(
        rename = "paid_by_employee_id",
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "deserialize_optional_oid"
    )]
    pub paid_by_employee_id: Option<ObjectId>,

    #[serde(default)]
    pub status: GeneralExpenseStatus,

    #[serde(default)]
    pub approved_date: Option<String>,

    #[serde(default)]
    pub document: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    #[serde(default)]
    pub cost_type: CostType,
}

/// Response type returned by the list endpoint — identical to GeneralExpense
/// but with the resolved employee name injected so the frontend never needs
/// to do client-side lookups.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralExpenseResponse {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub category: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "subTotal")]
    pub sub_total: f64,
    pub total_cgst: f64,
    pub total_sgst: f64,
    pub total_igst: f64,
    pub billed_to: Option<String>,
    pub tax_amount: Option<f64>,
    /// Resolved employee name (or legacy plain-text value for old records)
    pub paid_by: String,
    /// Raw ObjectId hex string — lets the frontend pre-select the dropdown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paid_by_employee_id: Option<String>,
    pub status: GeneralExpenseStatus,
    pub approved_date: Option<String>,
    pub document: String,
    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
    pub cost_type: CostType,
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
