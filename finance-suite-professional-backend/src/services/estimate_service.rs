use std::sync::Arc;

use mongodb::bson::oid::ObjectId;

use crate::{
    models::{
        estimate::Estimate,
        organisation::Organisation,
    },
    repository::{
        customer_repository::CustomerRepository,
        estimate_repository::{EstimateFilter, EstimateListResult, EstimateRepository},
        organisation_repository::OrganisationRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct EstimateService {
    repo: Arc<EstimateRepository>,
    user_repo: Arc<UserRepository>,
    org_repo: Arc<OrganisationRepository>,
    customer_repo: Arc<CustomerRepository>,
}

impl EstimateService {
    pub fn new(
        repo: EstimateRepository,
        user_repo: UserRepository,
        org_repo: OrganisationRepository,
        customer_repo: CustomerRepository,
    ) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
            org_repo: Arc::new(org_repo),
            customer_repo: Arc::new(customer_repo),
        }
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<crate::models::users::User> {
        self.user_repo
            .get_user_by_id(user_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))
    }

    fn format_estimate_number(prefix: &str, seq: i32) -> String {
        let normalized_prefix = prefix.trim().trim_end_matches('-');
        if normalized_prefix.is_empty() {
            format!("EST-{:03}", seq)
        } else {
            format!("EST-{}-{:03}", normalized_prefix, seq)
        }
    }

    fn first_org_address(org: &Organisation) -> String {
        org.addresses
            .first()
            .map(|address| address.value.clone())
            .unwrap_or_default()
    }

    fn apply_org_snapshot(estimate: &mut Estimate, org: &Organisation) {
        estimate.organization_name = org.organisation_name.clone();
        estimate.company_name = org.company_name.clone();
        estimate.company_address = Self::first_org_address(org);
        estimate.company_gstin = org.gst_in.clone();
        estimate.company_email = org.email.clone();
        estimate.company_phone = org.phone.clone();
        estimate.organization_details = Some(org.clone());
    }

    pub async fn generate_estimate_number(&self, org_id: &ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let seq = self.org_repo.get_next_estimate_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("Failed to get estimate sequence: {}", e))?;
        Ok(Self::format_estimate_number(&org.invoice_prefix, seq))
    }

    pub async fn peek_next_estimate_number(&self, org_id: &ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("Failed to get organisation: {}", e))?;
        let seq = self.org_repo.peek_next_estimate_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("Failed to peek estimate sequence: {}", e))?;
        Ok(Self::format_estimate_number(&org.invoice_prefix, seq))
    }

    async fn resolve_customer_name(&self, customer_id: Option<&ObjectId>) -> Option<String> {
        let id = customer_id?;
        self.customer_repo.get_display_name(id).await.ok().flatten()
    }

    async fn resolve_org_details(&self, org_id: Option<&ObjectId>) -> Option<Organisation> {
        let id = org_id?;
        let org = self.org_repo.get_organisation_by_id(&id.to_string()).await.ok()?;
        Some(org)
    }

    async fn enrich(&self, mut estimate: Estimate) -> Estimate {
        if estimate.customer_name.is_none() && estimate.customer_id.is_some() {
            estimate.customer_name = self.resolve_customer_name(estimate.customer_id.as_ref()).await;
        }
        if estimate.organization_id.is_some() {
            if estimate.organization_details.is_none() {
                estimate.organization_details = self.resolve_org_details(estimate.organization_id.as_ref()).await;
            }
            if estimate.organization_name.is_empty()
                || estimate.company_name.is_empty()
                || estimate.company_address.is_empty()
                || estimate.company_gstin.is_empty()
                || estimate.company_email.is_empty()
                || estimate.company_phone.is_empty()
            {
                if let Some(org_id) = estimate.organization_id.as_ref() {
                    if let Ok(org) = self.org_repo.get_organisation_by_id(&org_id.to_string()).await {
                        Self::apply_org_snapshot(&mut estimate, &org);
                    }
                }
            }
        }
        estimate
    }

    async fn enrich_many(&self, estimates: Vec<Estimate>) -> Vec<Estimate> {
        let mut result = Vec::with_capacity(estimates.len());
        for e in estimates {
            result.push(self.enrich(e).await);
        }
        result
    }

    pub async fn create(
        &self,
        mut estimate: Estimate,
        org_id: &ObjectId,
        user_id: &ObjectId,
    ) -> anyhow::Result<Estimate> {
        estimate.organization_id = Some(*org_id);
        estimate.created_by = Some(*user_id);
        // Always generate the number server-side — client value is ignored
        estimate.estimate_number = self.generate_estimate_number(org_id).await?;
        estimate.customer_name = self.resolve_customer_name(estimate.customer_id.as_ref()).await;
        if let Ok(org) = self.org_repo.get_organisation_by_id(&org_id.to_string()).await {
            Self::apply_org_snapshot(&mut estimate, &org);
        }
        let now = chrono::Utc::now().to_rfc3339();
        estimate.created_at = Some(now.clone());
        estimate.updated_at = Some(now);
        Ok(self.repo.create(estimate).await?)
    }

    pub async fn list(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Estimate>> {
        let estimates = self.repo.get_by_org(org_id).await?;
        Ok(self.enrich_many(estimates).await)
    }

    pub async fn list_filtered(
        &self,
        org_id: &ObjectId,
        filter: EstimateFilter,
    ) -> anyhow::Result<EstimateListResult> {
        let mut result = self.repo.list_filtered(org_id, filter).await?;
        result.data = self.enrich_many(result.data).await;
        Ok(result)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Estimate>> {
        match self.repo.get_by_id(id).await? {
            Some(e) => Ok(Some(self.enrich(e).await)),
            None => Ok(None),
        }
    }

    pub async fn get_by_customer(
        &self,
        customer_id: &ObjectId,
        org_id: &ObjectId,
    ) -> anyhow::Result<Vec<Estimate>> {
        let estimates = self.repo.get_by_customer(customer_id, org_id).await?;
        Ok(self.enrich_many(estimates).await)
    }

    pub async fn update(&self, id: &str, mut estimate: Estimate) -> anyhow::Result<Option<Estimate>> {
        // Re-resolve customer name in case customerId changed
        estimate.customer_name = self.resolve_customer_name(estimate.customer_id.as_ref()).await;
        if let Some(org_id) = estimate.organization_id.as_ref() {
            if let Ok(org) = self.org_repo.get_organisation_by_id(&org_id.to_string()).await {
                Self::apply_org_snapshot(&mut estimate, &org);
            }
        }
        estimate.updated_at = Some(chrono::Utc::now().to_rfc3339());
        Ok(self.repo.update(id, estimate).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
