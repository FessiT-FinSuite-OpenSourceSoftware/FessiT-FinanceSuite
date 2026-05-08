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

    fn parse_amount(value: &str) -> f64 {
        value
            .trim()
            .chars()
            .filter(|ch| ch.is_ascii_digit() || *ch == '.' || *ch == '-')
            .collect::<String>()
            .parse::<f64>()
            .unwrap_or(0.0)
    }

    fn normalize_totals(invoice: &mut IncomingInvoice) {
        if !invoice.total_before_tds.trim().is_empty() {
            return;
        }

        let gross_total = [
            invoice.sub_total.as_str(),
            invoice.total_cgst.as_str(),
            invoice.total_sgst.as_str(),
            invoice.total_igst.as_str(),
        ]
        .iter()
        .map(|value| Self::parse_amount(value))
        .sum::<f64>();

        if gross_total > 0.0 {
            invoice.total_before_tds = gross_total.to_string();
        }
    }

    pub async fn create(&self, mut invoice: IncomingInvoice, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<IncomingInvoice> {
        invoice.organisation_id = Some(*org_id);
        Self::normalize_totals(&mut invoice);
        Ok(self.repo.create(invoice).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<IncomingInvoice>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<IncomingInvoice>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, mut invoice: IncomingInvoice) -> anyhow::Result<Option<IncomingInvoice>> {
        Self::normalize_totals(&mut invoice);
        Ok(self.repo.update(id, invoice).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    pub async fn get_monthly_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        year: &str,
        month: &str,
    ) -> anyhow::Result<crate::repository::incoming_invoice_repository::IncomingInvoiceMonthlySummary> {
        Ok(self.repo.get_monthly_summary(org_id, year, month).await?)
    }

    pub async fn get_monthly_tds_summary(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        year: &str,
        month: &str,
    ) -> anyhow::Result<crate::repository::incoming_invoice_repository::IncomingInvoiceTdsSummary> {
        Ok(self.repo.get_monthly_tds_summary(org_id, year, month).await?)
    }
}
