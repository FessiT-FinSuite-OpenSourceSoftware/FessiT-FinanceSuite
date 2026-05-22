use std::sync::Arc;

use crate::{
    models::professional_tax_challan::ProfessionalTaxChallan,
    repository::{
        professional_tax_challan_repository::ProfessionalTaxChallanRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct ProfessionalTaxChallanService {
    repo: Arc<ProfessionalTaxChallanRepository>,
    user_repo: Arc<UserRepository>,
}

impl ProfessionalTaxChallanService {
    pub fn new(repo: ProfessionalTaxChallanRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    pub async fn create(&self, mut challan: ProfessionalTaxChallan, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<ProfessionalTaxChallan> {
        challan.organisation_id = Some(*org_id);
        Ok(self.repo.create(challan).await?)
    }

    pub async fn list(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<ProfessionalTaxChallan>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<ProfessionalTaxChallan>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, challan: ProfessionalTaxChallan) -> anyhow::Result<Option<ProfessionalTaxChallan>> {
        Ok(self.repo.update(id, challan).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }
}
