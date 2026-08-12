use std::sync::Arc;

use crate::{
    models::incoming_invoice::IncomingInvoice,
    repository::{
        incoming_invoice_repository::IncomingInvoiceRepository,
        user_repository::UserRepository,
        customer_repository::CustomerRepository,
    },
};

#[derive(Clone)]
pub struct IncomingInvoiceService {
    repo: Arc<IncomingInvoiceRepository>,
    user_repo: Arc<UserRepository>,
    customer_repo: Arc<CustomerRepository>,
}

impl IncomingInvoiceService {
    pub fn new(repo: IncomingInvoiceRepository, user_repo: UserRepository, customer_repo: CustomerRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
            customer_repo: Arc::new(customer_repo),
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

    async fn resolve_vendor_pan(&self, vendor_id: &Option<mongodb::bson::oid::ObjectId>) -> String {
        let Some(vid) = vendor_id else { return String::new(); };
        self.customer_repo.find_by_id(&vid.to_hex()).await
            .ok()
            .flatten()
            .and_then(|c| c.pan)
            .unwrap_or_default()
    }

    pub async fn create(&self, mut invoice: IncomingInvoice, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<IncomingInvoice> {
        invoice.organisation_id = Some(*org_id);
        if invoice.pan.is_empty() {
            invoice.pan = self.resolve_vendor_pan(&invoice.vendor_id).await;
        }
        Self::normalize_totals(&mut invoice);
        Ok(self.repo.create(invoice).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<IncomingInvoice>> {
        let mut invoices = self.repo.get_by_org(org_id).await?;
        // Enrich pan and vendor_name from live customer record for older records that lack them
        let needs_enrich = invoices.iter().any(|inv| inv.tds_applicable && (inv.pan.is_empty() || inv.vendor_name.is_empty()));
        if needs_enrich {
            for inv in invoices.iter_mut() {
                if !inv.tds_applicable { continue; }
                if inv.pan.is_empty() || inv.vendor_name.is_empty() {
                    if let Some(vid) = inv.vendor_id {
                        if let Ok(Some(customer)) = self.customer_repo.find_by_id(&vid.to_hex()).await {
                            if inv.pan.is_empty() {
                                inv.pan = customer.pan.unwrap_or_default();
                            }
                            if inv.vendor_name.is_empty() {
                                inv.vendor_name = if !customer.company_name.is_empty() {
                                    customer.company_name
                                } else {
                                    customer.customer_name
                                };
                            }
                        }
                    }
                }
            }
        }
        Ok(invoices)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<IncomingInvoice>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, mut invoice: IncomingInvoice) -> anyhow::Result<Option<IncomingInvoice>> {
        if invoice.pan.is_empty() {
            invoice.pan = self.resolve_vendor_pan(&invoice.vendor_id).await;
        }
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
