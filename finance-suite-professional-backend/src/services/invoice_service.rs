use std::sync::Arc;

use crate::{
    models::invoice::Invoice,
    repository::{
        invoice_repository::InvoiceRepository,
        organisation_repository::OrganisationRepository,
        service_repository::ServiceRepository,
        product_repository::ProductRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct InvoiceService {
    repo: Arc<InvoiceRepository>,
    org_repo: Arc<OrganisationRepository>,
    service_repo: Arc<ServiceRepository>,
    user_repo: Arc<UserRepository>,
    product_repo: Arc<ProductRepository>,
}

impl InvoiceService {
    pub fn new(
        repo: InvoiceRepository,
        org_repo: OrganisationRepository,
        service_repo: ServiceRepository,
        user_repo: UserRepository,
        _expense_repo: crate::repository::expense_repository::ExpenseRepository,
        _general_expense_repo: crate::repository::general_expense_repository::GeneralExpenseRepository,
        product_repo: ProductRepository,
    ) -> Self {
        Self {
            repo: Arc::new(repo),
            org_repo: Arc::new(org_repo),
            service_repo: Arc::new(service_repo),
            user_repo: Arc::new(user_repo),
            product_repo: Arc::new(product_repo),
        }
    }

    async fn validate_service_type(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        service_type_id: Option<&mongodb::bson::oid::ObjectId>,
    ) -> anyhow::Result<()> {
        let Some(service_type_id) = service_type_id else {
            return Ok(());
        };

        let service = self
            .service_repo
            .get_by_id(&service_type_id.to_hex())
            .await?
            .ok_or_else(|| anyhow::anyhow!("Service type not found"))?;

        if service.organisation_id != Some(*org_id) {
            return Err(anyhow::anyhow!("Service type does not belong to this organisation"));
        }

        Ok(())
    }

    pub async fn generate_invoice_number(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let next_sequence = self.org_repo.get_next_invoice_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("Failed to get next sequence: {}", e))?;
        Ok(format!("{}-{}-{:03}", org.invoice_prefix, org.starting_invoice_no, next_sequence))
    }

    pub async fn peek_next_invoice_number(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let next_sequence = self.org_repo.peek_next_invoice_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("Failed to peek next sequence: {}", e))?;
        Ok(format!("{}-{}-{:03}", org.invoice_prefix, org.starting_invoice_no, next_sequence))
    }

    pub async fn create_invoice(&self, mut invoice: Invoice, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Invoice> {
        log::info!("Creating invoice for org_id: {}", org_id);

        invoice.organisation_id = Some(*org_id);
        self.validate_service_type(org_id, invoice.service_type_id.as_ref()).await?;

        let provided = invoice.invoice_number.trim().to_string();
        if provided.is_empty() {
            invoice.invoice_number = self.generate_invoice_number(org_id).await
                .map_err(|e| { log::error!("Failed to generate invoice number: {}", e); e })?;
            log::info!("Generated invoice number: {}", invoice.invoice_number);
        } else {
            // If the provided number matches what we would generate, consume the sequence
            let peeked = self.peek_next_invoice_number(org_id).await.unwrap_or_default();
            if provided == peeked {
                let _ = self.org_repo.get_next_invoice_sequence_by_id(org_id).await;
            }
            invoice.invoice_number = provided;
            log::info!("Using provided invoice number: {}", invoice.invoice_number);
        }

        let created = self.repo.create_invoice(invoice).await?;
        log::info!("Invoice created successfully with ID: {:?}", created.id);

        for item in &created.items {
            if let Some(pid) = &item.product_id {
                let qty = item.hours.parse::<f64>().unwrap_or(0.0);
                if qty > 0.0 {
                    if let Err(e) = self.product_repo.add_sold_stocks(pid, qty).await {
                        log::error!("Failed to update sold_stocks for product {}: {}", pid, e);
                    }
                }
            }
        }

        Ok(created)
    }

    pub async fn get_all_invoices(&self) -> anyhow::Result<Vec<Invoice>> {
        Ok(self.repo.get_all_invoices().await?)
    }

    pub async fn get_invoices_by_organisation(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Invoice>> {
        Ok(self.repo.get_invoices_by_organisation(org_id).await?)
    }

    pub async fn get_invoices_by_company_email(&self, company_email: &str) -> anyhow::Result<Vec<Invoice>> {
        Ok(self.repo.get_invoices_by_company_email(company_email).await?)
    }

    pub async fn get_invoices_by_customer(&self, customer_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<Invoice>> {
        Ok(self.repo.get_invoices_by_customer(customer_id).await?)
    }

    pub async fn get_invoices_by_org_or_email(&self, org_id: &mongodb::bson::oid::ObjectId, company_email: &str) -> anyhow::Result<Vec<Invoice>> {
        Ok(self.repo.get_invoices_by_org_or_email(org_id, company_email).await?)
    }

    pub async fn get_invoice_by_id(&self, id: &str) -> anyhow::Result<Option<Invoice>> {
        Ok(self.repo.get_invoice_by_id(id).await?)
    }

    pub async fn update_invoice(
        &self,
        id: &str,
        invoice: Invoice,
    ) -> anyhow::Result<Option<Invoice>> {
        if let Some(org_id) = invoice.organisation_id.as_ref() {
            self.validate_service_type(org_id, invoice.service_type_id.as_ref()).await?;
        }
        Ok(self.repo.update_invoice(id, invoice).await?)
    }

    pub async fn delete_invoice(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete_invoice(id).await?)
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn get_organisation_by_id(&self, org_id: &str) -> anyhow::Result<crate::models::organisation::Organisation> {
        self.org_repo.get_organisation_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))
    }

    pub async fn get_monthly_gst_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        year: &str,
        month: &str,
    ) -> anyhow::Result<crate::repository::invoice_repository::MontlyGstSummary> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        Ok(self.repo.get_monthly_gst_summary(org_id, &org.email, year, month).await?)
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CombinedGstSummary {
    pub month: String,
    pub invoices: crate::repository::invoice_repository::MontlyGstSummary,
    pub expenses: crate::repository::expense_repository::ExpenseMonthlyGstSummary,
    pub general_expenses: crate::repository::general_expense_repository::GeneralExpenseMonthlyGstSummary,
}
