use std::sync::Arc;
use std::collections::HashSet;
use validator::Validate;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest, Organisation, UpdateOrganizationRequest, User};
use crate::models::service::Service;
use crate::models::users::UserPermissions;
use crate::repository::{OrganisationRepository, ServiceRepository};
use crate::services::UserService;

#[derive(Clone)]
pub struct OrganisationService {
    repository: OrganisationRepository,
    service_repository: Arc<ServiceRepository>,
    user_service: Arc<UserService>,
}

impl OrganisationService {
    pub fn new(repository: OrganisationRepository, service_repository: ServiceRepository, user_service: UserService) -> Self {
        Self {
            repository,
            service_repository: Arc::new(service_repository),
            user_service: Arc::new(user_service),
        }
    }

    async fn populate_services(&self, mut organisation: Organisation) -> Result<Organisation, ApiError> {
        if !organisation.service_ids.is_empty() {
            let services = self
                .service_repository
                .get_by_ids(&organisation.service_ids)
                .await
                .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
            organisation.services = services;
        }
        Ok(organisation)
    }

    async fn save_services(
        &self,
        org_id: &mongodb::bson::oid::ObjectId,
        services: Vec<Service>,
        existing_ids: &[mongodb::bson::oid::ObjectId],
    ) -> Result<Vec<mongodb::bson::oid::ObjectId>, ApiError> {
        if services.is_empty() {
            // Still repair any existing services that are missing organisationId
            let existing = self
                .service_repository
                .get_by_ids(existing_ids)
                .await
                .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
            let mut repaired_ids = Vec::new();
            for mut svc in existing {
                if svc.organisation_id.is_none() {
                    svc.organisation_id = Some(*org_id);
                    if let Some(id) = svc.id {
                        self.service_repository
                            .update(&id.to_hex(), svc)
                            .await
                            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
                        repaired_ids.push(id);
                    }
                } else if let Some(id) = svc.id {
                    repaired_ids.push(id);
                }
            }
            return Ok(if repaired_ids.is_empty() { existing_ids.to_vec() } else { repaired_ids });
        }

        let existing_services = self
            .service_repository
            .get_by_org(org_id)
            .await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;

        let mut collected = Vec::new();
        let mut seen_names: HashSet<String> = HashSet::new();
        for mut service in services {
            service.organisation_id = Some(*org_id);
            service.service_name = service.service_name.trim().to_string();
            if service.service_name.is_empty() {
                return Err(ApiError::ValidationError("Service name is required".to_string()));
            }

            let normalized_name = service.service_name.to_lowercase();
            if !seen_names.insert(normalized_name) {
                return Err(ApiError::ValidationError(format!(
                    "Service name '{}' already exists",
                    service.service_name
                )));
            }

            let matching_existing = existing_services.iter().find(|existing| {
                existing
                    .service_name
                    .trim()
                    .eq_ignore_ascii_case(&service.service_name)
            });

            if let Some(existing) = matching_existing {
                service.id = existing.id;
            }

            let duplicate = existing_services.iter().any(|existing| {
                existing.id != service.id
                    && existing
                        .service_name
                        .trim()
                        .eq_ignore_ascii_case(&service.service_name)
            });

            if duplicate {
                return Err(ApiError::ValidationError(
                    format!("Service name '{}' already exists", service.service_name),
                ));
            }

            if let Some(service_id) = service.id {
                let updated = self
                    .service_repository
                    .update(&service_id.to_hex(), service)
                    .await
                    .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
                let service_id = updated
                    .and_then(|record| record.id)
                    .ok_or_else(|| ApiError::DatabaseError("Service update did not return an id".to_string()))?;
                if !collected.contains(&service_id) {
                    collected.push(service_id);
                }
            } else {
                let created = self
                    .service_repository
                    .create(service)
                    .await
                    .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
                let service_id = created
                    .id
                    .ok_or_else(|| ApiError::DatabaseError("Service create did not return an id".to_string()))?;
                if !collected.contains(&service_id) {
                    collected.push(service_id);
                }
            }
        }
        Ok(collected)
    }

    pub async fn create_organisation(&self, req: CreateOrganisationRequest) -> Result<Organisation, ApiError> {
        req.validate()?;
        if req.addresses.is_empty() {
            return Err(ApiError::ValidationError(
                "At least one address is required".to_string(),
            ));
        }
        for address in &req.addresses {
            address.validate()?;
        }
        if let Some(_) = self.repository.find_by_email(&req.email).await? {
            return Err(ApiError::ValidationError(format!(
                "Organization with email already exists"
            )));
        }

        let services = req.services.clone();

        // Create organisation first
        let organisation = self.repository.create(req.clone()).await?;

        // Extract admin user details and create user
        if let Some(org_id) = organisation.id {
            let admin_user = User {
                id: None,
                name: req.new_user_name,
                email: req.new_user_email,
                password: req.new_user_password,
                role: "Admin".to_string(),
                organisation_id: Some(org_id),
                permissions: UserPermissions::default(),
                is_admin: true,
                is_active: true,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };

            // Create the admin user
            self.user_service.create_user(admin_user).await
                .map_err(|e| ApiError::ValidationError(format!("Failed to create admin user: {}", e)))?;
        }

        let mut organisation = organisation;
        if let Some(org_id) = organisation.id {
            let service_ids = self.save_services(&org_id, services, &[]).await?;
            organisation = self
                .repository
                .set_service_ids(&org_id.to_string(), service_ids)
                .await?;
        }

        self.populate_services(organisation).await
    }

     pub async fn get_all_organisation(&self) -> Result<Vec<Organisation>, ApiError> {
        let organisations = self.repository.find_all().await?;
        let mut populated = Vec::with_capacity(organisations.len());
        for organisation in organisations {
            populated.push(self.populate_services(organisation).await?);
        }
        Ok(populated)
    }
    
    pub async fn get_organisation_by_email(&self, email: &str) -> Result<Organisation, ApiError> {
        let organisation = self.repository.get_organisation_by_email(email).await?;
        self.populate_services(organisation).await
    }

    pub async fn get_organisation_by_user_email(&self, user_email: &str) -> Result<Organisation, ApiError> {
        log::info!("🔍 Searching for user with email: {}", user_email);
        
        // Find user by email
        let user = self.user_service.get_user_by_email(user_email).await
            .map_err(|e| ApiError::NotFound(format!("User with email '{}' not found: {}", user_email, e)))?;
        
        log::info!("👤 Found user: {}, organisation_id: {:?}", user.email, user.organisation_id);
        
        // Get user's organisation_id
        let org_id = user.organisation_id
            .ok_or_else(|| ApiError::NotFound(format!("User '{}' has no organisation", user_email)))?;
        
        // Fetch organisation by ID
        let organisation = self.repository.find_by_id(&org_id.to_string())
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Organisation with id '{}' not found", org_id)))?;
        self.populate_services(organisation).await
    }


    pub async fn get_organisation_by_id(&self, id: &str) -> Result<Organisation, ApiError> {
        let organisation = self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Organisation with id {} not found", id)))?;
        self.populate_services(organisation).await
    }
    pub async fn update_organisation(
        &self,
        id: &str,
        req: UpdateOrganizationRequest,
    ) -> Result<Organisation, ApiError> {
        // Validate request
        req.validate()?;

        // Check if organisation exists
        let existing = self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Organization with id {} not found", id)))?;

        // Validate addresses if provided
        if let Some(ref addresses) = req.addresses {
            if addresses.is_empty() {
                return Err(ApiError::ValidationError(
                    "At least one address is required".to_string(),
                ));
            }
            for address in addresses {
                address.validate()?;
            }
        }

        // Update user if user details are provided
        if req.new_user_name.is_some() || req.new_user_email.is_some() || req.new_user_password.is_some() {
            // Get users for this organisation and find the admin
            let org_id = existing.id.ok_or_else(|| ApiError::ValidationError("Organisation ID not found".to_string()))?;
            let org_users = self.user_service.get_users_by_organisation(&org_id).await
                .map_err(|e| ApiError::ValidationError(format!("Failed to fetch users: {}", e)))?;
            
            if let Some(admin_user) = org_users.iter().find(|u| u.is_admin) {
                if let Some(user_id) = admin_user.id {
                    let mut updated_user = admin_user.clone();
                    
                    if let Some(name) = req.new_user_name.clone() {
                        if !name.is_empty() {
                            updated_user.name = name;
                        }
                    }
                    if let Some(email) = req.new_user_email.clone() {
                        if !email.is_empty() {
                            updated_user.email = email;
                        }
                    }
                    if let Some(password) = req.new_user_password.clone() {
                        if !password.is_empty() {
                            updated_user.password = password;
                        }
                    }
                    updated_user.updated_at = chrono::Utc::now().to_rfc3339();
                    
                    self.user_service.update_user(&user_id.to_string(), updated_user).await
                        .map_err(|e| ApiError::ValidationError(format!("Failed to update admin user: {}", e)))?;
                }
            }
        }

        let services = req.services.clone();
        let organisation = self.repository.update(id, req).await?;
        let updated = if let Some(ref service_defs) = services {
            let org_id = organisation
                .id
                .ok_or_else(|| ApiError::ValidationError("Organisation ID not found".to_string()))?;
            let existing_ids = organisation.service_ids.clone();
            let service_ids = self.save_services(&org_id, service_defs.clone(), &existing_ids).await?;
            self.repository.set_service_ids(&org_id.to_string(), service_ids).await?
        } else {
            organisation
        };
        self.populate_services(updated).await
    }
     pub async fn delete_organisation(&self, id: &str) -> Result<bool, ApiError> {
        // Check if customer exists
        self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))?;

        self.repository.delete(id).await
    }
}
