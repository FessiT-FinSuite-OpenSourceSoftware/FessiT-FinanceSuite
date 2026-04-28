use mongodb::bson::{oid::ObjectId, Bson};
use serde::{Deserialize, Deserializer, Serialize};

fn deserialize_string_or_number<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    match Bson::deserialize(deserializer)? {
        Bson::String(s) => Ok(s),
        Bson::Double(f) => Ok(f.to_string()),
        Bson::Int32(i)  => Ok(i.to_string()),
        Bson::Int64(i)  => Ok(i.to_string()),
        Bson::Null      => Ok(String::new()),
        other => Ok(other.to_string()),
    }
}

// Deserializes SalaryStatus from any casing variant stored in MongoDB
fn deserialize_salary_status<'de, D>(deserializer: D) -> Result<SalaryStatus, D::Error>
where
    D: Deserializer<'de>,
{
    let s = match Bson::deserialize(deserializer)? {
        Bson::String(s) => s,
        other => other.to_string(),
    };
    Ok(match s.to_lowercase().as_str() {
        "paid"        => SalaryStatus::Paid,
        "onhold"      => SalaryStatus::OnHold,
        "settlement"  => SalaryStatus::Settlement,
        _             => SalaryStatus::YetToBePaid,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum SalaryStatus {
    YetToBePaid,
    Paid,
    OnHold,
    Settlement,
}

impl Default for SalaryStatus {
    fn default() -> Self {
        SalaryStatus::YetToBePaid
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Salary {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        skip_deserializing
    )]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub emp_name: String,

    #[serde(default)]
    pub emp_id: String,

    #[serde(default)]
    pub department: String,

    /// e.g. "2024-06" (YYYY-MM)
    #[serde(default)]
    pub period: String,

    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub gross_salary: String,

    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub tds: String,

    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub reimbursement: String,

    /// net_salary = gross_salary + reimbursement (computed on frontend, stored here)
    #[serde(default, deserialize_with = "deserialize_string_or_number")]
    pub net_salary: String,

    #[serde(default, deserialize_with = "deserialize_salary_status")]
    pub status: SalaryStatus,

    /// Date on which salary was paid
    #[serde(default)]
    pub paid_on: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

pub type CreateSalaryRequest = Salary;
pub type UpdateSalaryRequest = Salary;
