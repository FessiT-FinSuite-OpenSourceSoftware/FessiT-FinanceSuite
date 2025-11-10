use validator::Validate;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest, Organisation, UpdateOrganizationRequest};
use crate::repository::OrganisationRepository;

#[derive(Clone)]
pub struct OrganisationService{
    repository:OrganisationRepository,
}

impl OrganisationService{
    pub fn new(repository:OrganisationRepository)->Self{
        Self{repository}
    }
    pub async fn create_organisation(&self,req:CreateOrganisationRequest)->Result<Organisation,ApiError>{
        req.validate()?;
        if req.addresses.is_empty(){
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
        self.repository.create(req).await
    }

     pub async fn get_all_organisation(&self) -> Result<Vec<Organisation>, ApiError> {
        self.repository.find_all().await
    }
    pub async fn get_organisation_by_email(&self, email: &str) -> Result<Organisation, ApiError> {
    self.repository.get_organisation_by_email(email).await
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

    
        self.repository.update(id, req).await
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