use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// A single line item in the purchase order
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PurchaseOrderItem {
    #[serde(default)]
    pub description: String,

    #[serde(default)]
    pub quantity: String,

    #[serde(default)]
    pub rate: String,

    #[serde(rename = "itemTotal", default)]
    pub item_total: String,
}

/// Purchase Order document stored in MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseOrder {
    /// MongoDB document _id
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    // Organisation reference (important for multi-tenant system)
    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    // Domestic / International
    #[serde(default)]
    pub po_type: String,

    // Currency Type
    #[serde(default)]
    pub currency_type: String,

    // Company Info
    #[serde(default)]
    pub company_name: String,

    #[serde(rename = "gstIN", default)]
    pub gst_in: String,

    #[serde(default)]
    pub company_address: String,

    #[serde(default)]
    pub company_phone: String,

    #[serde(default)]
    pub company_email: String,

    // Purchase Order details
    #[serde(default)]
    pub po_number: String,

    #[serde(rename = "po_date", default)]
    pub po_date: String,

    #[serde(rename = "po_dueDate", default)]
    pub po_due_date: String,

    #[serde(default)]
    pub po_terms: String,

    #[serde(default)]
    pub place_of_supply: String,

    // Vendor Details
    #[serde(default)]
    pub vendor_name: String,

    #[serde(default)]
    pub vendor_address: String,

    #[serde(default)]
    pub vendor_gstin: String,

    #[serde(default)]
    pub vendor_phone: String,

    #[serde(default)]
    pub vendor_email: String,

    // Subject
    #[serde(default)]
    pub subject: String,

    // Purchase Order Items
    #[serde(default)]
    pub items: Vec<PurchaseOrderItem>,

    // Totals
    #[serde(rename = "subTotal", default)]
    pub sub_total: String,

    #[serde(default)]
    pub total: String,

    // Notes / Terms
    #[serde(default)]
    pub notes: String,

    // Status
    #[serde(default)]
    pub status: String,
}

/// For creation
pub type CreatePurchaseOrderRequest = PurchaseOrder;

/// For updates
pub type UpdatePurchaseOrderRequest = PurchaseOrder;
