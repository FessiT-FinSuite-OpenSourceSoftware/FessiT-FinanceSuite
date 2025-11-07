use validator::Validate;

use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::repository::CustomerRepository;

#[derive(Clone)]
pub struct CustomerService {
    repository: CustomerRepository,
}

impl CustomerService {
    pub fn new(repository: CustomerRepository) -> Self {
        Self { repository }
    }

    pub async fn create_customer(&self, req: CreateCustomerRequest) -> Result<Customer, ApiError> {
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
        self.repository.create(req).await
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

    pub async fn search_customers(&self, query: &str) -> Result<Vec<Customer>, ApiError> {
        if query.trim().is_empty() {
            return Err(ApiError::ValidationError(
                "Search query cannot be empty".to_string(),
            ));
        }

        self.repository.search(query).await
    }
}
