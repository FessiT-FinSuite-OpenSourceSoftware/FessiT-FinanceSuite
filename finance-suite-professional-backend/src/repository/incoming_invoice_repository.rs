use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId, Document, from_document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;
use chrono::Utc;

use crate::models::incoming_invoice::IncomingInvoice;

#[derive(Clone)]
pub struct IncomingInvoiceRepository {
    collection: Arc<Collection<IncomingInvoice>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_incoming_invoice(raw: Document) -> Option<IncomingInvoice> {
    let oid = raw.get_object_id("_id").ok();
    let mut invoice: IncomingInvoice = from_document(raw).ok()?;
    invoice.id = oid;
    Some(invoice)
}

impl IncomingInvoiceRepository {
    pub fn new(collection: Collection<IncomingInvoice>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<IncomingInvoice>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut invoices = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(inv) = doc_to_incoming_invoice(raw) {
                invoices.push(inv);
            }
        }
        Ok(invoices)
    }

    pub async fn create(&self, mut invoice: IncomingInvoice) -> Result<IncomingInvoice, MongoError> {
        let result = self.collection.insert_one(&invoice, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            invoice.id = Some(id);
        }
        Ok(invoice)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<IncomingInvoice>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<IncomingInvoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_incoming_invoice))
    }

    pub async fn update(&self, id: &str, mut invoice: IncomingInvoice) -> Result<Option<IncomingInvoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        invoice.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, invoice, None).await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(false),
        };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }

    pub async fn get_monthly_summary(&self, org_id: &ObjectId, year: &str, month: &str) -> Result<IncomingInvoiceMonthlySummary, MongoError> {
        let invoices = self.get_by_org(org_id).await?;

        let mut invoice_count      = 0u32;
        let mut total_amount       = 0.0f64;
        let mut total_cgst         = 0.0f64;
        let mut total_sgst         = 0.0f64;
        let mut total_igst         = 0.0f64;
        let mut paid_amount        = 0.0f64;
        let mut paid_invoice_count = 0u32;

        for inv in &invoices {
            let date = inv.invoice_date.trim();
            if date.len() < 7 { continue; }
            if &date[0..4] != year || &date[5..7] != month { continue; }

            let is_international = inv.invoice_type.trim().to_lowercase() == "international";
            let is_paid          = inv.status.trim().to_lowercase() == "paid";
            let raw_total        = inv.total.parse::<f64>().unwrap_or(0.0);

            invoice_count += 1;
            total_amount  += raw_total;

            if !is_international {
                total_cgst += inv.total_cgst.parse::<f64>().unwrap_or(0.0);
                total_sgst += inv.total_sgst.parse::<f64>().unwrap_or(0.0);
            } else {
                total_igst += inv.total_igst.parse::<f64>().unwrap_or(0.0);
            }

            if is_paid {
                paid_amount        += raw_total;
                paid_invoice_count += 1;
            }
        }

        Ok(IncomingInvoiceMonthlySummary {
            month: format!("{}-{}", year, month),
            invoice_count,
            total_amount,
            total_cgst,
            total_sgst,
            total_igst,
            total_gst_collected: total_cgst + total_sgst + total_igst,
            paid_amount,
            paid_invoice_count,
        })
    }

    pub async fn get_monthly_tds_summary(&self, org_id: &ObjectId, year: &str, month: &str) -> Result<IncomingInvoiceTdsSummary, MongoError> {
        let invoices = self.get_by_org(org_id).await?;

        let mut invoice_count      = 0u32;
        let mut total_tds_deducted = 0.0f64;

        for inv in &invoices {
            if !inv.tds_applicable { continue; }
            if inv.status.trim().to_lowercase() != "paid" { continue; }

            let date = inv.invoice_date.trim();
            if date.len() < 7 { continue; }
            if &date[0..4] != year || &date[5..7] != month { continue; }

            let tds = inv.tds_total.parse::<f64>().unwrap_or(0.0);
            invoice_count      += 1;
            total_tds_deducted += tds;
        }

        Ok(IncomingInvoiceTdsSummary {
            month: format!("{}-{}", year, month),
            invoice_count,
            total_tds_deducted,
            tds_on_paid: total_tds_deducted,
            tds_pending: 0.0,
        })
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IncomingInvoiceMonthlySummary {
    pub month: String,
    pub invoice_count: u32,
    pub total_amount: f64,
    pub total_cgst: f64,
    pub total_sgst: f64,
    pub total_igst: f64,
    pub total_gst_collected: f64,
    pub paid_amount: f64,
    pub paid_invoice_count: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IncomingInvoiceTdsSummary {
    pub month: String,
    /// Number of Paid invoices with tds_applicable = true in the current month
    pub invoice_count: u32,
    /// Sum of tds_total for Paid + tds_applicable invoices this month
    pub total_tds_deducted: f64,
    pub tds_on_paid: f64,
    pub tds_pending: f64,
}
