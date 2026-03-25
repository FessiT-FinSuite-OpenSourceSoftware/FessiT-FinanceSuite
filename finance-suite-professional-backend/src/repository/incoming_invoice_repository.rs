use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId, Document, from_document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;

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
}
