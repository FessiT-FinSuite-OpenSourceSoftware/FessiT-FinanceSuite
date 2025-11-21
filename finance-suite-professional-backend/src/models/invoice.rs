use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// CGST Tax block for a line item
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CGST {
    #[serde(rename = "cgstPercent", default)]
    pub cgst_percent: String,

    #[serde(rename = "cgstAmount", default)]
    pub cgst_amount: String,
}

/// SGST Tax block for a line item
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SGST {
    #[serde(rename = "sgstPercent", default)]
    pub sgst_percent: String,

    #[serde(rename = "sgstAmount", default)]
    pub sgst_amount: String,
}

/// IGST Tax block for a line item
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IGST {
    #[serde(rename = "igstPercent", default)]
    pub igst_percent: String,

    #[serde(rename = "igstAmount", default)]
    pub igst_amount: String,
}

/// A single line item in the invoice
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct InvoiceItem {
    #[serde(default)]
    pub description: String,

    #[serde(default)]
    pub hours: String,

    #[serde(default)]
    pub rate: String,

    #[serde(default)]
    pub cgst: CGST,

    #[serde(default)]
    pub sgst: SGST,

    #[serde(default)]
    pub igst: IGST,

    #[serde(rename = "itemTotal", default)]
    pub item_total: String,
}

/// The Invoice document stored in MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invoice {
    /// MongoDB document _id
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    // Domestic / International
    #[serde(default)]
    pub invoice_type: String,

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

    // LUT & IEC (used in International invoices)
    #[serde(default)]
    pub lut_no: String,

    #[serde(default)]
    pub iec_no: String,

    // Invoice details
    #[serde(default)]
    pub invoice_number: String,

    #[serde(rename = "invoice_date", default)]
    pub invoice_date: String,

    #[serde(rename = "invoice_dueDate", default)]
    pub invoice_due_date: String,

    #[serde(default)]
    pub invoice_terms: String,

    #[serde(default)]
    pub po_number: String,

    #[serde(default)]
    pub po_date: String,

    #[serde(default)]
    pub place_of_supply: String,

    // Bill To
    #[serde(default)]
    pub billcustomer_name: String,

    #[serde(default)]
    pub billcustomer_address: String,

    #[serde(default)]
    pub billcustomer_gstin: String,

    // Ship To
    #[serde(default)]
    pub shipcustomer_name: String,

    #[serde(default)]
    pub shipcustomer_address: String,

    #[serde(default)]
    pub shipcustomer_gstin: String,

    // Subject line
    #[serde(default)]
    pub subject: String,

    // Invoice items
    #[serde(default)]
    pub items: Vec<InvoiceItem>,

    // Totals
    #[serde(rename = "subTotal", default)]
    pub sub_total: String,

    #[serde(default)]
    pub totalcgst: String,

    #[serde(default)]
    pub totalsgst: String,

    #[serde(default)]
    pub totaligst: String,

    #[serde(default)]
    pub total: String,

    // Notes / Terms & Conditions
    #[serde(default)]
    pub notes: String,

    #[serde(default)]
    pub status: String,
}

/// For creation (POST /invoices)
pub type CreateInvoiceRequest = Invoice;

/// For updates (PUT /invoices/{id})
pub type UpdateInvoiceRequest = Invoice;
