use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Product image (stored UUID filename)
    #[serde(default)]
    pub image: String,

    /// Product name
    #[serde(default)]
    pub name: String,

    /// Product description
    #[serde(default)]
    pub description: String,

    /// HSN code
    #[serde(default)]
    pub hsn: String,

    /// Item / SKU code
    #[serde(default)]
    pub item_code: String,

    /// Category reference stored as the category document ObjectId
    pub category: ObjectId,

    // ── More info ────────────────────────────────────────────────────────────

    /// Manufacturer name
    #[serde(default)]
    pub manufacturer: String,

    /// Current stock quantity
    #[serde(default)]
    pub stocks: f64,

    /// Sale price
    #[serde(default)]
    pub sale_price: f64,

    /// Discount percentage
    #[serde(default)]
    pub discount: f64,

    /// Purchased / cost price
    #[serde(default)]
    pub purchased_price: f64,

    /// Tax percentage
    #[serde(default)]
    pub tax: f64,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}
