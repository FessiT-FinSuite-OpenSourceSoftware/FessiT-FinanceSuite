use std::sync::Arc;
use mongodb::bson::oid::ObjectId;
use crate::{
    models::delivery_challan::DeliveryChallan,
    repository::{
        delivery_challan_repository::DeliveryChallanRepository,
        organisation_repository::OrganisationRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct DeliveryChallanService {
    repo:     Arc<DeliveryChallanRepository>,
    user_repo: Arc<UserRepository>,
    org_repo:  Arc<OrganisationRepository>,
}

impl DeliveryChallanService {
    pub fn new(
        repo: DeliveryChallanRepository,
        user_repo: UserRepository,
        org_repo: OrganisationRepository,
    ) -> Self {
        Self {
            repo:      Arc::new(repo),
            user_repo: Arc::new(user_repo),
            org_repo:  Arc::new(org_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    fn format_challan_no(prefix: &str, seq: i32) -> String {
        let p = prefix.trim().trim_end_matches('-');
        if p.is_empty() {
            format!("DC-{:03}", seq)
        } else {
            format!("DC-{}-{:03}", p, seq)
        }
    }

    pub async fn generate_challan_no(&self, org_id: &ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        let seq = self.org_repo.get_next_delivery_challan_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        Ok(Self::format_challan_no(&org.invoice_prefix, seq))
    }

    pub async fn peek_next_challan_no(&self, org_id: &ObjectId) -> anyhow::Result<String> {
        let org = self.org_repo.get_organisation_by_id(&org_id.to_string()).await
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        let seq = self.org_repo.peek_next_delivery_challan_sequence_by_id(org_id).await
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        Ok(Self::format_challan_no(&org.invoice_prefix, seq))
    }

    pub async fn create(&self, mut dc: DeliveryChallan, org_id: &ObjectId) -> anyhow::Result<DeliveryChallan> {
        dc.organisation_id = Some(*org_id);
        // Always generate server-side — ignore any client-supplied value
        dc.challan_no = self.generate_challan_no(org_id).await?;
        Ok(self.repo.create(dc).await?)
    }

    pub async fn list_paginated(
        &self,
        org_id: &ObjectId,
        page: u64,
        page_size: u64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<DeliveryChallan>, u64)> {
        Ok(self.repo.get_by_org_paginated(org_id, page, page_size, search, status).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<DeliveryChallan>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, dc: DeliveryChallan) -> anyhow::Result<Option<DeliveryChallan>> {
        Ok(self.repo.update(id, dc).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
