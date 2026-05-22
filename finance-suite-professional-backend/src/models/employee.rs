use mongodb::bson::{oid::ObjectId, Bson};
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum EmployeeType {
    #[default]
    Permanent,
    Contract,
    Intern,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum EmployeeStatus {
    #[default]
    #[serde(rename = "full-time")]
    FullTime,
    Probation,
    Relieved,
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
pub struct Employee {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub first_name: String,

    #[serde(default)]
    pub last_name: String,

    #[serde(default)]
    pub emp_id: String,

    #[serde(default)]
    pub email: String,

    #[serde(default)]
    pub personal_email: String,

    #[serde(default)]
    pub primary_contact: String,

    #[serde(default)]
    pub emergency_contact: String,

    #[serde(default)]
    pub communication_address: String,

    #[serde(default)]
    pub permanent_address: String,

    #[serde(default)]
    pub pan_number: String,

    #[serde(default)]
    pub uan_number: String,

    #[serde(default)]
    pub passport_number: String,

    #[serde(default)]
    pub passport_issued_date: String,

    #[serde(default)]
    pub passport_expiry_date: String,

    // ── New fields ──────────────────────────────────────────────────────────

    #[serde(default)]
    pub employee_type: EmployeeType,

    #[serde(default)]
    pub status: EmployeeStatus,

    #[serde(default)]
    pub department: String,

    #[serde(default)]
    pub join_date: String,

    #[serde(default)]
    pub exit_date: String,

    /// ObjectId of another Employee who is the reporting manager
    #[serde(
        rename = "reportingManagerId",
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "deserialize_optional_oid"
    )]
    pub reporting_manager_id: Option<ObjectId>,

    /// Denormalized name — set at write time for display
    #[serde(rename = "reportingManagerName", default, skip_serializing_if = "Option::is_none")]
    pub reporting_manager_name: Option<String>,

    /// Stored UUID filename of the employee photo
    #[serde(default)]
    pub photo: String,

    // ────────────────────────────────────────────────────────────────────────

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

pub type CreateEmployeeRequest = Employee;
pub type UpdateEmployeeRequest = Employee;
