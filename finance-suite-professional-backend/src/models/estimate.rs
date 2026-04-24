use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Deserializer, Serialize};

use super::organisation::Organisation;

/// Used only when deserializing from JSON (API requests) where the client
/// may send an empty string instead of null/omitting the field.
pub fn deserialize_optional_object_id_str<'de, D>(
    deserializer: D,
) -> Result<Option<ObjectId>, D::Error>
where
    D: Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s.as_deref() {
        None | Some("") => Ok(None),
        Some(v) => ObjectId::parse_str(v).map(Some).map_err(serde::de::Error::custom),
    }
}

/// Used when deserializing from BSON (MongoDB documents) where ObjectId is
/// stored natively, not as a string.
pub fn deserialize_optional_object_id_bson<'de, D>(
    deserializer: D,
) -> Result<Option<ObjectId>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<ObjectId>::deserialize(deserializer)
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub enum EstimateStatus {
    #[default]
    Draft,
    Sent,
    Accepted,
    Rejected,
    Expired,
    Converted,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct EstimateItem {
    #[serde(
        rename = "itemId",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub item_id: Option<ObjectId>,

    #[serde(default)]
    pub name: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(default)]
    pub quantity: f64,

    #[serde(rename = "unitPrice", default)]
    pub unit_price: f64,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discount: Option<f64>,

    #[serde(rename = "taxRate", default, skip_serializing_if = "Option::is_none")]
    pub tax_rate: Option<f64>,

    #[serde(default)]
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Estimate {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    #[serde(rename = "estimateNumber", default)]
    pub estimate_number: String,

    #[serde(
        rename = "customerId",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub customer_id: Option<ObjectId>,

    /// Denormalized customer display name — set at write time, never sent by client
    #[serde(rename = "customerName", default, skip_serializing_if = "Option::is_none")]
    pub customer_name: Option<String>,

    #[serde(default)]
    pub items: Vec<EstimateItem>,

    #[serde(default)]
    pub subtotal: f64,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discount: Option<f64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tax: Option<f64>,

    #[serde(default)]
    pub total: f64,

    #[serde(default)]
    pub status: EstimateStatus,

    #[serde(rename = "issueDate", default)]
    pub issue_date: String,

    #[serde(rename = "expiryDate", default, skip_serializing_if = "Option::is_none")]
    pub expiry_date: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terms: Option<String>,

    #[serde(default)]
    pub currency: String,

    #[serde(
        rename = "convertedToInvoiceId",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub converted_to_invoice_id: Option<ObjectId>,

    #[serde(
        rename = "createdBy",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub created_by: Option<ObjectId>,

    #[serde(
        rename = "organizationId",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub organization_id: Option<ObjectId>,

    #[serde(rename = "organizationName", default)]
    pub organization_name: String,

    #[serde(rename = "companyName", default)]
    pub company_name: String,

    #[serde(rename = "companyAddress", default)]
    pub company_address: String,

    #[serde(rename = "companyGstin", default)]
    pub company_gstin: String,

    #[serde(rename = "companyEmail", default)]
    pub company_email: String,

    #[serde(rename = "companyPhone", default)]
    pub company_phone: String,

    /// Denormalized org snapshot — set at write time, never sent by client
    #[serde(rename = "organizationDetails", default, skip_serializing_if = "Option::is_none")]
    pub organization_details: Option<Organisation>,

    #[serde(rename = "createdAt", default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    #[serde(rename = "updatedAt", default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// Request body struct — used only for JSON deserialization from the API.
/// ObjectId fields accept either a valid hex string or empty string (→ None).
#[derive(Debug, Deserialize, Clone)]
pub struct EstimateRequest {
    #[serde(rename = "estimateNumber", default)]
    pub estimate_number: String,

    #[serde(
        rename = "customerId",
        deserialize_with = "deserialize_optional_object_id_str",
        default
    )]
    pub customer_id: Option<ObjectId>,

    #[serde(default)]
    pub items: Vec<EstimateItemRequest>,

    #[serde(default)]
    pub subtotal: f64,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discount: Option<f64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tax: Option<f64>,

    #[serde(default)]
    pub total: f64,

    #[serde(default)]
    pub status: EstimateStatus,

    #[serde(rename = "issueDate", default)]
    pub issue_date: String,

    #[serde(rename = "expiryDate", default)]
    pub expiry_date: Option<String>,

    #[serde(default)]
    pub notes: Option<String>,

    #[serde(default)]
    pub terms: Option<String>,

    #[serde(default)]
    pub currency: String,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct EstimateItemRequest {
    #[serde(
        rename = "itemId",
        deserialize_with = "deserialize_optional_object_id_str",
        default
    )]
    pub item_id: Option<ObjectId>,

    #[serde(default)]
    pub name: String,

    #[serde(default)]
    pub description: Option<String>,

    #[serde(default)]
    pub quantity: f64,

    #[serde(rename = "unitPrice", default)]
    pub unit_price: f64,

    #[serde(default)]
    pub discount: Option<f64>,

    #[serde(rename = "taxRate", default)]
    pub tax_rate: Option<f64>,

    #[serde(default)]
    pub amount: f64,
}

impl From<EstimateRequest> for Estimate {
    fn from(r: EstimateRequest) -> Self {
        Estimate {
            id: None,
            estimate_number: r.estimate_number,
            customer_id: r.customer_id,
            customer_name: None, // populated by the service after customer lookup
            items: r.items.into_iter().map(|i| EstimateItem {
                item_id: i.item_id,
                name: i.name,
                description: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
                discount: i.discount,
                tax_rate: i.tax_rate,
                amount: i.amount,
            }).collect(),
            subtotal: r.subtotal,
            discount: r.discount,
            tax: r.tax,
            total: r.total,
            status: r.status,
            issue_date: r.issue_date,
            expiry_date: r.expiry_date,
            notes: r.notes,
            terms: r.terms,
            currency: r.currency,
            converted_to_invoice_id: None,
            created_by: None,
            organization_id: None,
            organization_name: String::new(),
            company_name: String::new(),
            company_address: String::new(),
            company_gstin: String::new(),
            company_email: String::new(),
            company_phone: String::new(),
            organization_details: None,
            created_at: None,
            updated_at: None,
        }
    }
}
