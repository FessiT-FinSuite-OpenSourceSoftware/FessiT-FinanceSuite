use std::sync::Arc;

use mongodb::bson::oid::ObjectId;

use crate::{
    models::service::Service,
    repository::{service_repository::ServiceRepository, user_repository::UserRepository},
};

#[derive(Clone)]
pub struct ServiceService {
    repo: Arc<ServiceRepository>,
    user_repo: Arc<UserRepository>,
}

impl ServiceService {
    pub fn new(repo: ServiceRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> anyhow::Result<crate::models::users::User> {
        self.user_repo
            .get_user_by_id(user_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))
    }

    pub async fn create(&self, mut service: Service, org_id: &ObjectId) -> anyhow::Result<Service> {
        service.organisation_id = Some(*org_id);
        let service_name = service.service_name.trim().to_string();
        if service_name.is_empty() {
            return Err(anyhow::anyhow!("Service name is required"));
        }
        let existing = self.repo.get_by_org(org_id).await?;
        if existing
            .iter()
            .any(|item| item.service_name.trim().eq_ignore_ascii_case(&service_name))
        {
            return Err(anyhow::anyhow!("Service name must be unique"));
        }
        service.service_name = service_name;
        Ok(self.repo.create(service).await?)
    }

    pub async fn list(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Service>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Service>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, service: Service) -> anyhow::Result<Option<Service>> {
        let existing = self
            .repo
            .get_by_id(id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Service not found"))?;

        let mut service = service;
        let service_name = service.service_name.trim().to_string();
        if service_name.is_empty() {
            return Err(anyhow::anyhow!("Service name is required"));
        }
        let org_id = existing
            .organisation_id
            .ok_or_else(|| anyhow::anyhow!("Service has no organisation"))?;
        let siblings = self.repo.get_by_org(&org_id).await?;
        if siblings.iter().any(|item| {
            item.id != existing.id
                && item.service_name.trim().eq_ignore_ascii_case(&service_name)
        }) {
            return Err(anyhow::anyhow!("Service name must be unique"));
        }
        service.organisation_id = Some(org_id);
        service.service_name = service_name;
        Ok(self.repo.update(id, service).await?)
    }
}
