use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CostType {
    Direct,
    Indirect,
}

impl Default for CostType {
    fn default() -> Self { CostType::Indirect }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IncomingInvoiceItem {
    #[serde(default)]
    pub description: String,

    #[serde(default)]
    pub quantity: String,

    #[serde(default)]
    pub rate: String,

    #[serde(rename = "cgstPercent", default)]
    pub cgst_percent: String,

    #[serde(rename = "sgstPercent", default)]
    pub sgst_percent: String,

    #[serde(rename = "igstPercent", default)]
    pub igst_percent: String,

    #[serde(rename = "itemTotal", default)]
    pub item_total: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IncomingInvoice {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none", skip_deserializing)]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub vendor_name: String,

    #[serde(default)]
    pub invoice_type: String,

    #[serde(default)]
    pub vendor_gstin: String,

    #[serde(default)]
    pub vendor_address: String,

    #[serde(default)]
    pub invoice_number: String,

    #[serde(default)]
    pub invoice_date: String,

    #[serde(default)]
    pub due_date: String,

    #[serde(default)]
    pub place_of_supply: String,

    #[serde(default)]
    pub approved_date: Option<String>,

    #[serde(default)]
    pub paid_date: Option<String>,
    
    #[serde(default)]
    pub currency_type: String,

    #[serde(default)]
    pub purchase_order_id: String,

    #[serde(default)]
    pub items: Vec<IncomingInvoiceItem>,

    #[serde(rename = "subTotal", default)]
    pub sub_total: String,

    #[serde(default)]
    pub total_cgst: String,

    #[serde(default)]
    pub total_sgst: String,

    #[serde(default)]
    pub total_igst: String,

    #[serde(default)]
    pub total: String,

    #[serde(default)]
    pub invoice_file: String,

    #[serde(default)]
    pub notes: String,

    #[serde(default)]
    pub status: String,

    #[serde(default)]
    pub tds_applicable: bool,

     #[serde(default)]
    pub tds_total: String,

    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    #[serde(rename = "vendorId", skip_serializing_if = "Option::is_none")]
    pub vendor_id: Option<ObjectId>,

    #[serde(default)]
    pub cost_type: CostType,
}

pub type CreateIncomingInvoiceRequest = IncomingInvoice;
pub type UpdateIncomingInvoiceRequest = IncomingInvoice;
