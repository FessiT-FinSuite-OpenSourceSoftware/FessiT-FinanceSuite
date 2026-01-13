use std::sync::Arc;

use crate::{
    models::invoice::Invoice,
    repository::{invoice_repository::InvoiceRepository, organisation_repository::OrganisationRepository},
    error::ApiError,
};

#[derive(Clone)]
pub struct InvoiceService {
    repo: Arc<InvoiceRepository>,
    org_repo: Arc<OrganisationRepository>,
}

impl InvoiceService {
    pub fn new(repo: InvoiceRepository, org_repo: OrganisationRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            org_repo: Arc::new(org_repo),
        }
    }

    pub async fn generate_invoice_number(&self, org_email: &str) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_email(org_email).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let next_sequence = self.org_repo.get_next_invoice_sequence(org_email).await
            .map_err(|e| anyhow::anyhow!("Failed to get next sequence: {}", e))?;
        
        let invoice_number = format!(
            "{}-{}-{:03}",
            org.invoice_prefix,
            org.starting_invoice_no,
            next_sequence
        );
        
        Ok(invoice_number)
    }

    pub async fn peek_next_invoice_number(&self, org_email: &str) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_email(org_email).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let next_sequence = self.org_repo.peek_next_invoice_sequence(org_email).await
            .map_err(|e| anyhow::anyhow!("Failed to peek next sequence: {}", e))?;
        
        let invoice_number = format!(
            "{}-{}-{:03}",
            org.invoice_prefix,
            org.starting_invoice_no,
            next_sequence
        );
        
        Ok(invoice_number)
    }

    pub async fn create_invoice(&self, mut invoice: Invoice, org_email: &str) -> anyhow::Result<Invoice> {
        log::info!("Creating invoice for org_email: {}", org_email);
        
        match self.generate_invoice_number(org_email).await {
            Ok(invoice_number) => {
                log::info!("Generated invoice number: {}", invoice_number);
                invoice.invoice_number = invoice_number;
            }
            Err(e) => {
                log::error!("Failed to generate invoice number: {}", e);
                return Err(e);
            }
        }
        
        let created = self.repo.create_invoice(invoice).await?;
        log::info!("Invoice created successfully with ID: {:?}", created.id);
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
