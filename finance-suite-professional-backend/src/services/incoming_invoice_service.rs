use std::sync::Arc;

use crate::{
    models::incoming_invoice::IncomingInvoice,
    repository::{
        incoming_invoice_repository::IncomingInvoiceRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct IncomingInvoiceService {
    repo: Arc<IncomingInvoiceRepository>,
    user_repo: Arc<UserRepository>,
}

impl IncomingInvoiceService {
    pub fn new(repo: IncomingInvoiceRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut invoice: IncomingInvoice, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<IncomingInvoice> {
        invoice.organisation_id = Some(*org_id);
        Ok(self.repo.create(invoice).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<IncomingInvoice>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<IncomingInvoice>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, invoice: IncomingInvoice) -> anyhow::Result<Option<IncomingInvoice>> {
        Ok(self.repo.update(id, invoice).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    pub async fn get_monthly_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<crate::repository::incoming_invoice_repository::IncomingInvoiceMonthlySummary> {
        Ok(self.repo.get_monthly_summary(org_id).await?)
    }

    pub async fn get_monthly_tds_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
    ) -> anyhow::Result<crate::repository::incoming_invoice_repository::IncomingInvoiceTdsSummary> {
        Ok(self.repo.get_monthly_tds_summary(org_id).await?)
    }
}
