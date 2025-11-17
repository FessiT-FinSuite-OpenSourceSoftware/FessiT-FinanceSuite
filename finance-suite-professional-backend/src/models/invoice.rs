use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// Nested CGST info: { cgstPercent, cgstAmount }
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct InvoiceItemTax {
    #[serde(rename = "cgstPercent", default)]
    pub cgst_percent: String,
    #[serde(rename = "cgstAmount", default)]
    pub cgst_amount: String,
}

/// Nested SGST info: { sgstPercent, sgstAmount }
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct InvoiceItemSgstTax {
    #[serde(rename = "sgstPercent", default)]
    pub sgst_percent: String,
    #[serde(rename = "sgstAmount", default)]
    pub sgst_amount: String,
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
    pub cgst: InvoiceItemTax,

    #[serde(default)]
    pub sgst: InvoiceItemSgstTax,

    #[serde(rename = "itemTotal", default)]
    pub item_total: String,
}

/// Main Invoice document stored in MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invoice {
    /// MongoDB _id
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub company_name: String,

    #[serde(rename = "gstIN", default)]
    pub gst_in: String,

    #[serde(rename = "company_address", default)]
    pub company_address: String,

    #[serde(default)]
    pub company_phone: String,

    #[serde(default)]
    pub company_email: String,

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
    pub place_of_supply: String,

    #[serde(default)]
    pub billcustomer_name: String,

    #[serde(default)]
    pub billcustomer_address: String,

    #[serde(default)]
    pub billcustomer_gstin: String,

    #[serde(default)]
    pub shipcustomer_name: String,

    #[serde(default)]
    pub shipcustomer_address: String,

    #[serde(default)]
    pub shipcustomer_gstin: String,

    #[serde(default)]
    pub subject: String,

    #[serde(default)]
    pub items: Vec<InvoiceItem>,

    #[serde(rename = "subTotal", default)]
    pub sub_total: String,

    #[serde(default)]
    pub totalcgst: String,

    #[serde(default)]
    pub totalsgst: String,

    #[serde(default)]
    pub total: String,

    #[serde(default)]
    pub notes: String,

    #[serde(default)]
    pub status: String,
}

/// For now, creation & update use the same shape as Invoice (minus / ignoring _id).
/// If later you want partial updates, we can change UpdateInvoiceRequest to use Option<T>.
pub type CreateInvoiceRequest = Invoice;
pub type UpdateInvoiceRequest = Invoice;
