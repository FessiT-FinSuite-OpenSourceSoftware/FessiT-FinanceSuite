use std::sync::Arc;
use validator::Validate;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest, Organisation, UpdateOrganizationRequest, User};
use crate::models::users::UserPermissions;
use crate::repository::OrganisationRepository;
use crate::services::UserService;

#[derive(Clone)]
pub struct OrganisationService {
    repository: OrganisationRepository,
    user_service: Arc<UserService>,
}

impl OrganisationService {
    pub fn new(repository: OrganisationRepository, user_service: UserService) -> Self {
        Self {
            repository,
            user_service: Arc::new(user_service),
        }
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

        Ok(organisation)
    }

     pub async fn get_all_organisation(&self) -> Result<Vec<Organisation>, ApiError> {
        self.repository.find_all().await
    }
    
    pub async fn get_organisation_by_email(&self, email: &str) -> Result<Organisation, ApiError> {
        self.repository.get_organisation_by_email(email).await
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
        self.repository.find_by_id(&org_id.to_string())
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Organisation with id '{}' not found", org_id)))
    }


    pub async fn get_organisation_by_id(&self, id: &str) -> Result<Organisation, ApiError> {
        self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Organisation with id {} not found", id)))
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

        Ok(self.repository.update(id, req).await?)
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