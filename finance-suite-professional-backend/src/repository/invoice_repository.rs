use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId, Document, from_document},
    error::Error as MongoError,
    Collection,
};

use crate::models::invoice::Invoice;

#[derive(Clone)]
pub struct InvoiceRepository {
    collection: Arc<Collection<Invoice>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_invoice(mut raw: Document) -> Option<Invoice> {
    let oid = raw.get_object_id("_id").ok();
    let mut invoice: Invoice = from_document(raw).ok()?;
    invoice.id = oid;
    Some(invoice)
}

impl InvoiceRepository {
    pub fn new(collection: Collection<Invoice>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    pub async fn create_invoice(&self, mut invoice: Invoice) -> Result<Invoice, MongoError> {
        let insert_result = self.collection.insert_one(&invoice, None).await?;
        if let Some(id) = insert_result.inserted_id.as_object_id() {
            invoice.id = Some(id);
        }
        Ok(invoice)
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Invoice>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut invoices = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(inv) = doc_to_invoice(raw) {
                invoices.push(inv);
            }
        }
        Ok(invoices)
    }

    pub async fn get_all_invoices(&self) -> Result<Vec<Invoice>, MongoError> {
        self.fetch_many(None).await
    }

    pub async fn get_invoices_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<Invoice>, MongoError> {
        log::info!("🔍 Filtering invoices by organisationId: {}", org_id);
        let invoices = self.fetch_many(doc! { "organisationId": org_id }).await?;
        log::info!("📊 Found {} invoices for organisation {}", invoices.len(), org_id);
        Ok(invoices)
    }

    pub async fn get_invoices_by_company_email(&self, company_email: &str) -> Result<Vec<Invoice>, MongoError> {
        log::info!("🔍 Filtering invoices by company_email: {}", company_email);
        let invoices = self.fetch_many(doc! { "company_email": company_email }).await?;
        log::info!("📊 Found {} invoices for company_email {}", invoices.len(), company_email);
        Ok(invoices)
    }

    pub async fn get_invoices_by_org_or_email(&self, org_id: &ObjectId, company_email: &str) -> Result<Vec<Invoice>, MongoError> {
        log::info!("🔍 Filtering invoices by organisationId: {} OR company_email: {}", org_id, company_email);
        let filter = doc! { "$or": [{ "organisationId": org_id }, { "company_email": company_email }] };
        let invoices = self.fetch_many(filter).await?;
        log::info!("📊 Found {} invoices", invoices.len());
        Ok(invoices)
    }

    pub async fn get_invoice_by_id(&self, id: &str) -> Result<Option<Invoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_invoice))
    }

    pub async fn update_invoice(&self, id: &str, invoice: Invoice) -> Result<Option<Invoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let mut invoice_to_update = invoice;
        invoice_to_update.id = Some(oid);

        let update_result = self.collection.replace_one(doc! { "_id": oid }, invoice_to_update, None).await?;

        if update_result.matched_count == 0 {
            Ok(None)
        } else {
            self.get_invoice_by_id(id).await
        }
    }

    pub async fn delete_invoice(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(false),
        };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }

    /// Get GST summary for invoices generated in the current calendar month for an org
    pub async fn get_monthly_gst_summary(&self, org_id: &ObjectId, company_email: &str) -> Result<MontlyGstSummary, MongoError> {
        // Same fetch as list_invoices: match by organisationId OR company_email
        let invoices = self.get_invoices_by_org_or_email(org_id, company_email).await?;

        let now = chrono::Utc::now();
        let current_year  = now.format("%Y").to_string();
        let current_month = now.format("%m").to_string();

        let mut total_cgst         = 0.0f64;
        let mut total_sgst         = 0.0f64;
        let mut total_igst_inr     = 0.0f64;
        let mut invoice_count      = 0u32;
        let mut paid_amount        = 0.0f64;
        let mut paid_invoice_count = 0u32;
        let mut breakdown          = Vec::new();

        for inv in &invoices {
            let date = inv.invoice_date.trim();
            if date.len() < 7 { continue; }
            if &date[0..4] != current_year || &date[5..7] != current_month { continue; }

            let is_paid = inv.status == crate::models::invoice::InvoiceStatus::Paid;
            if !is_paid {
                continue;
            }

            let is_international = inv.invoice_type.trim().to_lowercase() == "international";

            let fx_rate: f64 = if is_international {
                let cr = inv.conversion_rate.parse::<f64>().unwrap_or(0.0);
                if cr > 0.0 {
                    cr
                } else {
                    log::warn!(
                        "[GST] Skipping paid international invoice {} because conversionRate is missing",
                        inv.invoice_number
                    );
                    continue;
                }
            } else {
                1.0
            };

            if is_international && fx_rate <= 0.0 {
                log::warn!(
                    "[GST] Skipping paid international invoice {} because conversionRate is invalid",
                    inv.invoice_number
                );
                continue;
            }

            let raw_total = inv.total.parse::<f64>().unwrap_or(0.0);
            let sub_total = inv.sub_total.parse::<f64>().unwrap_or(0.0);
            let taxable_inr = sub_total * fx_rate;
            let inr_total = raw_total * fx_rate;

            let (cgst_line, sgst_line, igst_inr_line) = if !is_international {
                let c = inv.totalcgst.parse::<f64>().unwrap_or(0.0);
                let s = inv.totalsgst.parse::<f64>().unwrap_or(0.0);
                total_cgst += c;
                total_sgst += s;
                (c, s, 0.0)
            } else {
                let igst_f = inv.totaligst.parse::<f64>().unwrap_or(0.0);
                let igst_i = igst_f * fx_rate;
                total_igst_inr += igst_i;
                (0.0, 0.0, igst_i)
            };

            invoice_count += 1;

            if is_paid {
                paid_amount        += inr_total;
                paid_invoice_count += 1;
            }

            log::info!(
                "[GST] {} | {} | {} | {:?} | raw={} fx={} inr={} cgst={} sgst={} igst_inr={} paid={}",
                inv.invoice_number, inv.invoice_type, inv.currency_type, inv.status,
                raw_total, fx_rate, inr_total, cgst_line, sgst_line, igst_inr_line, is_paid
            );

            breakdown.push(InvoiceGstLine {
                invoice_date:   inv.invoice_date.clone(),
                invoice_number: inv.invoice_number.clone(),
                invoice_type:   inv.invoice_type.clone(),
                party_name:     inv.billcustomer_name.clone(),
                currency:       inv.currency_type.clone(),
                status:         format!("{:?}", inv.status),
                raw_total,
                sub_total,
                fx_rate,
                taxable_inr,
                inr_total,
                cgst: cgst_line,
                sgst: sgst_line,
                igst_inr: igst_inr_line,
                is_paid,
            });
        }

        let total_gst_collected = total_cgst + total_sgst + total_igst_inr;
        log::info!("[GST] TOTAL: count={} cgst={} sgst={} igst_inr={} gst_total={} paid_amount={} paid_count={}",
            invoice_count, total_cgst, total_sgst, total_igst_inr, total_gst_collected, paid_amount, paid_invoice_count);

        Ok(MontlyGstSummary {
            month: format!("{}-{}", current_year, current_month),
            invoice_count,
            total_cgst,
            total_sgst,
            total_igst: total_igst_inr,
            total_gst_collected,
            paid_amount,
            paid_invoice_count,
            breakdown,
        })
    }
}

use futures::stream::TryStreamExt;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InvoiceGstLine {
    pub invoice_date: String,
    pub invoice_number: String,
    pub invoice_type: String,
    pub party_name: String,
    pub currency: String,
    pub status: String,
    pub raw_total: f64,
    pub sub_total: f64,
    pub fx_rate: f64,
    pub taxable_inr: f64,
    pub inr_total: f64,
    pub cgst: f64,
    pub sgst: f64,
    pub igst_inr: f64,
    pub is_paid: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MontlyGstSummary {
    pub month: String,
    pub invoice_count: u32,
    pub total_cgst: f64,
    pub total_sgst: f64,
    pub total_igst: f64,
    pub total_gst_collected: f64,
    /// Sum of `total` (in INR) for Paid invoices in the current month
    pub paid_amount: f64,
    /// Count of Paid invoices in the current month
    pub paid_invoice_count: u32,
    /// Per-invoice breakdown for debugging
    pub breakdown: Vec<InvoiceGstLine>,
}
