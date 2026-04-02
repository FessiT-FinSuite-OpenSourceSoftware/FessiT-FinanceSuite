use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

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

    #[serde(default)]
    pub gross_salary: String,

    #[serde(default)]
    pub tds: String,
    
    #[serde(default)]
    pub reimbursement: String,

    /// net_salary = gross_salary + reimbursement (computed on frontend, stored here)
    #[serde(default)]
    pub net_salary: String,

    #[serde(default)]
    pub status: SalaryStatus,

    /// Date on which salary was paid
    #[serde(default)]
    pub paid_on: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}

pub type CreateSalaryRequest = Salary;
pub type UpdateSalaryRequest = Salary;
