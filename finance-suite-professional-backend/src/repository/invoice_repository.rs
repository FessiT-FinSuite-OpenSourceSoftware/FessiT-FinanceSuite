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
}

use futures::stream::TryStreamExt;
