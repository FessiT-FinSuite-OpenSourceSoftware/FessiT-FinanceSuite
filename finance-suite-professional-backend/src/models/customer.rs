use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

use super::address::Address;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum CustomerRole {
    #[serde(rename = "Customer")]
    Customer,
    #[serde(rename = "Vendor")]
    Vendor,
    #[serde(rename = "Both")]
    Both,
}

impl Default for CustomerRole {
    fn default() -> Self {
        CustomerRole::Customer
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct Project {
    #[validate(length(min = 1, message = "Project name is required"))]
    #[serde(rename = "projectName")]
    pub project_name: String,

    #[serde(rename = "description")]
    pub description: Option<String>,

    #[validate(length(min = 1, message = "Project owner is required"))]
    #[serde(rename = "projectOwner")]
    pub project_owner: String,

    #[serde(rename = "owner_email")]
    pub owner_email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct Customer {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    #[validate(length(min = 1, message = "Customer name is required"))]
    #[serde(rename = "customerName")]
    pub customer_name: String,

    #[validate(length(min = 1, message = "Company name is required"))]
    #[serde(rename = "companyName")]
    pub company_name: String,

    #[validate(length(min = 1, message = "GSTIN is required"))]
    #[serde(rename = "gstIN")]
    pub gst_in: String,

    #[serde(rename = "CustomerCode", default)]
    pub customer_code: String,

    #[validate(length(min = 1, message = "At least one address is required"))]
    pub addresses: Vec<Address>,

    #[validate(length(min = 1, message = "Country is required"))]
    pub country: String,

    #[serde(rename = "countryCode")]
    pub country_code: String,

    #[validate(regex(
        path = "crate::utils::validation::PHONE_REGEX",
        message = "Invalid phone number"
    ))]
    pub phone: String,

    #[serde(rename = "isActive")]
    pub is_active: String,

    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    /// "Customer" | "Vendor" | "Both"
    #[serde(default)]
    pub role: CustomerRole,

    /// Legacy field kept for backward compat — mirrors role
    #[serde(default)]
    pub is_vendor_too: bool,

    #[serde(rename = "lastCostCenterSequence", default)]
    pub last_cost_center_sequence: i32,

    #[serde(default)]
    pub projects: Vec<Project>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCustomerRequest {
    #[serde(rename = "customerName")]
    pub customer_name: String,
    #[serde(rename = "companyName")]
    pub company_name: String,
    #[serde(rename = "gstIN")]
    pub gst_in: String,
    #[serde(rename = "CustomerCode", default)]
    pub customer_code: String,
    pub addresses: Vec<Address>,
    pub country: String,
    pub phone: String,
    pub email: String,
    /// New: "Customer" | "Vendor" | "Both"
    #[serde(default)]
    pub role: Option<CustomerRole>,
    /// Legacy bool still accepted
    #[serde(default)]
    pub isvendor: bool,
    #[serde(rename = "countryCode")]
    pub country_code: String,
    #[serde(rename = "isActive")]
    pub is_active: String,
    #[serde(default)]
    pub projects: Vec<Project>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCustomerRequest {
    #[serde(rename = "customerName")]
    pub customer_name: Option<String>,
    #[serde(rename = "companyName")]
    pub company_name: Option<String>,
    #[serde(rename = "gstIN")]
    pub gst_in: Option<String>,
    #[serde(rename = "CustomerCode")]
    pub customer_code: Option<String>,
    pub addresses: Option<Vec<Address>>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    #[serde(default)]
    pub role: Option<CustomerRole>,
    #[serde(default)]
    pub isvendor: Option<bool>,
    #[serde(rename = "countryCode")]
    pub country_code: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<String>,
    pub projects: Option<Vec<Project>>,
}

impl Customer {
    pub fn new(req: CreateCustomerRequest) -> Self {
        let role = req.role.unwrap_or_else(|| {
            if req.isvendor { CustomerRole::Both } else { CustomerRole::Customer }
        });
        let is_vendor_too = matches!(role, CustomerRole::Vendor | CustomerRole::Both);
        Self {
            id: None,
            organisation_id: None,
            customer_name: req.customer_name,
            company_name: req.company_name,
            gst_in: req.gst_in,
            customer_code: req.customer_code,
            addresses: req.addresses,
            country: req.country,
            phone: req.phone,
            email: req.email,
            role,
            is_vendor_too,
            country_code: req.country_code,
            is_active: req.is_active,
            last_cost_center_sequence: 0,
            projects: req.projects,
        }
    }
}
