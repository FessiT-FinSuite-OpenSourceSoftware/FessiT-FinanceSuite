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
        req.validate()?;
        if req.addresses.is_empty() {
            return Err(ApiError::ValidationError("At least one address is required".to_string()));
        }
        for address in &req.addresses {
            address.validate()?;
        }
        self.repository.create(req).await
    }

    pub async fn get_all_customers(&self) -> Result<Vec<Customer>, ApiError> {
        self.repository.find_all().await
    }

    pub async fn get_customer_by_id(&self, id: &str) -> Result<Customer, ApiError> {
        self.repository.find_by_id(id).await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))
    }

    pub async fn update_customer(&self, id: &str, req: UpdateCustomerRequest) -> Result<Customer, ApiError> {
        req.validate()?;
        self.repository.find_by_id(id).await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))?;

        if let Some(addresses) = &req.addresses {
            if addresses.is_empty() {
                return Err(ApiError::ValidationError("At least one address is required".to_string()));
            }
            for addr in addresses {
                addr.validate()?;
            }
        }
        self.repository.update(id, req).await
    }

    pub async fn delete_customer(&self, id: &str) -> Result<bool, ApiError> {
        self.repository.find_by_id(id).await?
            .ok_or_else(|| ApiError::NotFound(format!("Customer with id {} not found", id)))?;
        self.repository.delete(id).await
    }

    pub async fn search_customers(&self, query: &str) -> Result<Vec<Customer>, ApiError> {
        if query.trim().is_empty() {
            return Err(ApiError::ValidationError("Search query cannot be empty".to_string()));
        }
        self.repository.search(query).await
    }
}
