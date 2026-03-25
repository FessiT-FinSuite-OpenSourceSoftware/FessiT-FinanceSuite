use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CostCenter {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(rename = "projectName", default)]
    pub project_name: String,

    /// Auto-generated: e.g. NWIL26-A000001
    #[serde(rename = "costCenterNumber", default)]
    pub cost_center_number: String,

    #[serde(rename = "customerId", skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<ObjectId>,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    #[serde(default)]
    pub status: String,

    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCostCenterRequest {
    #[serde(rename = "projectName")]
    pub project_name: String,

    #[serde(rename = "customerId")]
    pub customer_id: String,

    #[serde(default)]
    pub status: String,

    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCostCenterRequest {
    #[serde(rename = "projectName")]
    pub project_name: Option<String>,

    #[serde(default)]
    pub status: Option<String>,

    #[serde(default)]
    pub description: Option<String>,
}
