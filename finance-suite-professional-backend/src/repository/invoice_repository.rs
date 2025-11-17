use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId},
    error::Error as MongoError,
    Collection,
};

use crate::models::invoice::Invoice;

#[derive(Clone)]
pub struct InvoiceRepository {
    collection: Arc<Collection<Invoice>>,
}

impl InvoiceRepository {
    pub fn new(collection: Collection<Invoice>) -> Self {
        Self {
            collection: Arc::new(collection),
        }
    }

    pub async fn create_invoice(&self, mut invoice: Invoice) -> Result<Invoice, MongoError> {
        let insert_result = self.collection.insert_one(&invoice, None).await?;
        if let Some(id) = insert_result.inserted_id.as_object_id() {
            invoice.id = Some(id);
        }
        Ok(invoice)
    }

    pub async fn get_all_invoices(&self) -> Result<Vec<Invoice>, MongoError> {
        let mut cursor = self.collection.find(None, None).await?;
        let mut invoices = Vec::new();

        while let Some(doc) = cursor.try_next().await.unwrap_or(None) {
            invoices.push(doc);
        }

        Ok(invoices)
    }

    pub async fn get_invoice_by_id(
        &self,
        id: &str,
    ) -> Result<Option<Invoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let filter = doc! { "_id": oid };
        let invoice = self.collection.find_one(filter, None).await?;
        Ok(invoice)
    }

    pub async fn update_invoice(
        &self,
        id: &str,
        invoice: Invoice,
    ) -> Result<Option<Invoice>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        // Make sure we don't overwrite _id with some other value
        let mut invoice_to_update = invoice.clone();
        invoice_to_update.id = Some(oid);

        let filter = doc! { "_id": oid };
        let update_result = self
            .collection
            .replace_one(filter, invoice_to_update, None)
            .await?;

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

        let filter = doc! { "_id": oid };
        let result = self.collection.delete_one(filter, None).await?;
        Ok(result.deleted_count > 0)
    }
}

// Needed for try_next() in get_all_invoices
use futures::stream::TryStreamExt;
