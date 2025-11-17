use std::sync::Arc;

use crate::{
    models::invoice::Invoice,
    repository::invoice_repository::InvoiceRepository,
};

#[derive(Clone)]
pub struct InvoiceService {
    repo: Arc<InvoiceRepository>,
}

impl InvoiceService {
    pub fn new(repo: InvoiceRepository) -> Self {
        Self {
            repo: Arc::new(repo),
        }
    }

    pub async fn create_invoice(&self, invoice: Invoice) -> anyhow::Result<Invoice> {
        let created = self.repo.create_invoice(invoice).await?;
        Ok(created)
    }

    pub async fn get_all_invoices(&self) -> anyhow::Result<Vec<Invoice>> {
        let invoices = self.repo.get_all_invoices().await?;
        Ok(invoices)
    }

    pub async fn get_invoice_by_id(&self, id: &str) -> anyhow::Result<Option<Invoice>> {
        let invoice = self.repo.get_invoice_by_id(id).await?;
        Ok(invoice)
    }

    pub async fn update_invoice(
        &self,
        id: &str,
        invoice: Invoice,
    ) -> anyhow::Result<Option<Invoice>> {
        let updated = self.repo.update_invoice(id, invoice).await?;
        Ok(updated)
    }

    pub async fn delete_invoice(&self, id: &str) -> anyhow::Result<bool> {
        let deleted = self.repo.delete_invoice(id).await?;
        Ok(deleted)
    }
}
