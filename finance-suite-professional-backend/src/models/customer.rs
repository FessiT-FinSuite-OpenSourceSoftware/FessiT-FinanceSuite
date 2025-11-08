use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

use super::address::Address;

#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct Customer {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[validate(length(min = 1, message = "Customer name is required"))]
    #[serde(rename = "customerName")]
    pub customer_name: String,

    #[validate(length(min = 1, message = "Company name is required"))]
    #[serde(rename = "companyName")]
    pub company_name: String,

    #[validate(length(min = 1, message = "GSTIN is required"))]
    #[serde(rename = "gstIN")]
    pub gst_in: String,

    #[validate(length(min = 1, message = "At least one address is required"))]
    pub addresses: Vec<Address>,

    #[validate(length(min = 1, message = "Country is required"))]
    pub country: String,
<<<<<<< HEAD

    #[validate(regex(path = "crate::utils::validation::PHONE_REGEX", message = "Invalid phone number"))]
    pub phone: String,

    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[serde(rename = "createdAt")]
    pub created_at: Option<DateTime<Utc>>,

    #[serde(rename = "updatedAt")]
    pub updated_at: Option<DateTime<Utc>>,
=======
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
    // #[serde(rename = "createdAt")]
    // pub created_at: Option<DateTime<Utc>>,

    // #[serde(rename = "updatedAt")]
    // pub updated_at: Option<DateTime<Utc>>,
>>>>>>> Phoenix-Reborn
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCustomerRequest {
    #[serde(rename = "customerName")]
    pub customer_name: String,
    #[serde(rename = "companyName")]
    pub company_name: String,
    #[serde(rename = "gstIN")]
    pub gst_in: String,
    pub addresses: Vec<Address>,
    pub country: String,
    pub phone: String,
    pub email: String,
<<<<<<< HEAD
=======
    #[serde(rename = "countryCode")]
    pub country_code: String,
    #[serde(rename = "isActive")]
    pub is_active: String,
>>>>>>> Phoenix-Reborn
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCustomerRequest {
    #[serde(rename = "customerName")]
    pub customer_name: Option<String>,
    #[serde(rename = "companyName")]
    pub company_name: Option<String>,
    #[serde(rename = "gstIN")]
    pub gst_in: Option<String>,
    pub addresses: Option<Vec<Address>>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
<<<<<<< HEAD
=======
    #[serde(rename = "countryCode")]
    pub country_code: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<String>,
>>>>>>> Phoenix-Reborn
}

impl Customer {
    pub fn new(req: CreateCustomerRequest) -> Self {
        Self {
            id: None,
            customer_name: req.customer_name,
            company_name: req.company_name,
            gst_in: req.gst_in,
            addresses: req.addresses,
            country: req.country,
            phone: req.phone,
            email: req.email,
<<<<<<< HEAD
            created_at: Some(Utc::now()),
            updated_at: Some(Utc::now()),
=======
            country_code: req.country_code,
            is_active: req.is_active,
            // created_at: Some(Utc::now()),
            // updated_at: Some(Utc::now()),
>>>>>>> Phoenix-Reborn
        }
    }
}
