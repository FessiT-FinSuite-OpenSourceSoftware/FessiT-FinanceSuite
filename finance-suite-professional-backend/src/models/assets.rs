use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMode {
    Cash,
    BankTransfer,
    Upi,
    Card,
    Cheque,
    Other,
}

impl Default for PaymentMode {
    fn default() -> Self { PaymentMode::BankTransfer }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    Rental,
    Owned,
}

impl Default for AssetType {
    fn default() -> Self { AssetType::Owned }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AssetStatus {
    Active,
    Repair,
    Obsolete,
    Maintenance,
}

impl Default for AssetStatus {
    fn default() -> Self { AssetStatus::Active }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    /// Asset image (stored UUID filename)
    #[serde(default)]
    pub image: String,

    /// Asset name
    #[serde(default)]
    pub name: String,

    /// Asset description
    #[serde(default)]
    pub description: String,

    /// HSN code
    #[serde(default)]
    pub hsn: String,

    /// Item / SKU code
    #[serde(default)]
    pub item_code: String,

    /// Category reference
    pub category: ObjectId,

    /// Manufacturer name
    #[serde(default)]
    pub manufacturer: String,

    /// Vendor / supplier name
    #[serde(default)]
    pub vendor: String,

    /// Payment mode used to purchase this asset
    #[serde(default)]
    pub payment_mode: PaymentMode,

    /// Current stock / quantity
    #[serde(default)]
    pub stocks: f64,

    /// Warranty period (e.g. "1 year", "6 months")
    #[serde(default)]
    pub warranty_period: String,

    /// Current status of the asset
    #[serde(default)]
    pub asset_status: AssetStatus,

    /// Sale price
    #[serde(default)]
    pub sale_price: f64,

    /// Purchased / cost price
    #[serde(default)]
    pub purchased_price: f64,

    /// Tax percentage
    #[serde(default)]
    pub tax: f64,

    /// Date of purchase (stored as string, e.g. "2024-01-15")
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub purchased_date: String,

    /// Additional notes
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub notes: String,

    /// Date the asset was assigned
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub assigned_date: String,

    /// Person / department the asset is assigned to
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub assigned_to: String,

    /// Serial number of the asset
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub serial_no: String,

    /// Asset type: rental or owned
    #[serde(default)]
    pub asset_type: AssetType,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}
