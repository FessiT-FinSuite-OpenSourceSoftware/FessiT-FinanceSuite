use chrono::{DateTime,Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize,Serialize};
use validator::Validate;

use super::address::Address;

#[derive(Debug,Deserialize,Serialize,Clone,Validate)]
pub struct Organisation{
    #[serde(rename="_id",skip_serializing_if="Option::is_none")]
    pub id:Option<ObjectId>,
    #[validate(length(min = 1, message = "Organistion name is required"))]
    #[serde(rename="organizationName")]
    pub organisation_name:String,
    #[validate(length(min = 1, message = "Company name is required"))]
    #[serde(rename = "companyName")]
    pub company_name:String,
     #[validate(length(min = 1, message = "GSTIN is required"))]
    #[serde(rename = "gstIN")]
    pub gst_in: String,


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
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
}

#[derive(Debug,Deserialize,Validate)]
pub struct CreateOrganisationRequest {
    #[serde(rename="organizationName")]
    pub organisation_name:String,
    #[serde(rename="companyName")]
    pub company_name:String,
    #[serde(rename="gstIN")]
    pub gst_in:String,
    #[serde(rename="countryCode")]
    pub country_code:String,
    pub addresses :Vec<Address>,
    pub country:String,
    pub phone:String,
    pub email:String,
}

#[derive(Debug,Deserialize,Validate)]
pub struct UpdateOrganizationRequest{
     #[serde(rename="organizationName")]
    pub organisation_name:Option<String>,
    #[serde(rename="companyName")]
    pub company_name:Option<String>,
    #[serde(rename="gstIN")]
    pub gst_in:Option<String>,
    #[serde(rename="countryCode")]
    pub country_code:Option<String>,
    pub addresses :Option<Vec<Address>>,
    pub country:Option<String>,
    pub phone:Option<String>,
    pub email:Option<String>,
}

impl Organisation{
    pub fn new(req:CreateOrganisationRequest)->Self{
        Self{
            id:None,
            organisation_name:req.organisation_name,
            company_name:req.company_name,
            gst_in:req.gst_in,
            addresses:req.addresses,
            country:req.country,
            country_code:req.country_code,
            phone:req.phone,
            email:req.email
        }
    }
}
