use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DeliveryChallanItem {
    #[serde(default)]
    pub description: String,

    #[serde(default)]
    pub hsn_code: String,

    #[serde(default)]
    pub quantity: String,

    #[serde(default)]
    pub unit: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeliveryChallan {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub challan_no: String,

    #[serde(default)]
    pub challan_date: String,

    #[serde(default)]
    pub dispatch_date: String,

    #[serde(default)]
    pub invoice_ref: String,

    #[serde(default)]
    pub po_reference: String,

    #[serde(default)]
    pub place_of_supply: String,

    #[serde(default)]
    pub purpose: String,

    #[serde(default)]
    pub consignor_name: String,

    #[serde(default)]
    pub consignor_address: String,

    #[serde(default)]
    pub consignor_gstin: String,

    #[serde(default)]
    pub consignee_name: String,

    #[serde(default)]
    pub consignee_address: String,

    #[serde(default)]
    pub consignee_gstin: String,

    #[serde(default)]
    pub items: Vec<DeliveryChallanItem>,

    #[serde(default)]
    pub delivery_notes: String,

    #[serde(default)]
    pub status: String,

    /// Stored UUID filename of the dispatched copy upload
    #[serde(default)]
    pub dispatched_copy: String,

    /// Stored UUID filename of the acknowledged copy upload
    #[serde(default)]
    pub acknowledged_copy: String,

    #[serde(rename = "customerId", skip_serializing_if = "Option::is_none")]
    pub customer_id: Option<ObjectId>,

    #[serde(rename = "invoiceId", skip_serializing_if = "Option::is_none")]
    pub invoice_id: Option<ObjectId>,

    #[serde(rename = "purchaseOrderId", skip_serializing_if = "Option::is_none")]
    pub purchase_order_id: Option<ObjectId>,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
}
