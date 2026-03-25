use validator::Validate;
use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::models::users::{User, UserPermissions};
use crate::repository::{CustomerRepository, UserRepository};
use mongodb::bson::oid::ObjectId;
use std::sync::Arc;

#[derive(Clone)]
pub struct CustomerService {
    repository: CustomerRepository,
    user_repo: Arc<UserRepository>,
}

impl CustomerService {
    pub fn new(repository: CustomerRepository, user_repo: UserRepository) -> Self {
        Self { 
            repository,
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> Result<UserPermissions, ApiError> {
        let user = self.user_repo.get_user_by_id(user_id).await
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?
            .ok_or_else(|| ApiError::NotFound("User not found".to_string()))?;
        Ok(user.permissions)
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> Result<User, ApiError> {
        let user = self.user_repo.get_user_by_id(user_id).await
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?
            .ok_or_else(|| ApiError::NotFound("User not found".to_string()))?;
        Ok(user)
    }

    pub async fn get_customers_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<Customer>, ApiError> {
        self.repository.find_by_organisation(org_id).await
    }

    pub async fn search_customers_by_organisation(&self, query: &str, org_id: &ObjectId) -> Result<Vec<Customer>, ApiError> {
        if query.trim().is_empty() {
            return Err(ApiError::ValidationError(
                "Search query cannot be empty".to_string(),
            ));
        }
        self.repository.search_by_organisation(query, org_id).await
    }

    pub async fn create_customer(&self, req: CreateCustomerRequest, org_id: Option<ObjectId>) -> Result<Customer, ApiError> {
        // Validate request
        req.validate()?;

        // Additional business logic validation
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
                "Customer with email already exists"
            )));
        }
        // Create customer
        self.repository.create(req, org_id).await
    }

    pub async fn get_all_customers(&self) -> Result<Vec<Customer>, ApiError> {
        self.repository.find_all().await
    }

    pub async fn get_customer_by_id(&self, id: &str) -> Result<Customer, ApiError> {
        self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))
    }

    pub async fn update_customer(
        &self,
        id: &str,
        req: UpdateCustomerRequest,
    ) -> Result<Customer, ApiError> {
        // Validate request
        req.validate()?;

        // Check if customer exists
        self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))?;

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

        // Update customer
        self.repository.update(id, req).await
    }

    pub async fn delete_customer(&self, id: &str) -> Result<bool, ApiError> {
        // Check if customer exists
        self.repository
            .find_by_id(id)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))?;

        self.repository.delete(id).await
    }

    pub async fn delete_customer_by_gstin(&self, gstin: &str) -> Result<bool, ApiError> {
        // Validate GSTIN is not empty
        if gstin.trim().is_empty() {
            return Err(ApiError::ValidationError(
                "GSTIN cannot be empty".to_string(),
            ));
        }

        self.repository.delete_by_gstin(gstin).await
    }

    pub async fn delete_customer_by_email(&self, email: &str) -> Result<bool, ApiError> {
        // Validate email is not empty
        if email.trim().is_empty() {
            return Err(ApiError::ValidationError(
                "Email cannot be empty".to_string(),
            ));
        }

        self.repository.delete_by_email(email).await
    }

    pub async fn get_all_projects_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<mongodb::bson::Document>, ApiError> {
        self.repository.get_all_projects_by_organisation(org_id).await
    }

    pub async fn add_project(&self, customer_id: &str, project: crate::models::customer::Project) -> Result<crate::models::Customer, ApiError> {
        self.repository
            .find_by_id(customer_id).await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer {} not found", customer_id)))?;
        self.repository.add_project(customer_id, project).await
    }

    pub async fn update_project(&self, customer_id: &str, index: usize, project: crate::models::customer::Project) -> Result<crate::models::Customer, ApiError> {
        self.repository.update_project(customer_id, index, project).await
    }

    pub async fn delete_project(&self, customer_id: &str, index: usize) -> Result<crate::models::Customer, ApiError> {
        self.repository.delete_project(customer_id, index).await
    }

    pub async fn search_customers(&self, query: &str) -> Result<Vec<Customer>, ApiError> {
        if query.trim().is_empty() {
            return Err(ApiError::ValidationError(
                "Search query cannot be empty".to_string(),
            ));
        }

        self.repository.search(query).await
    }
}