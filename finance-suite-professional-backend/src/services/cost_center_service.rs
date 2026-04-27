use std::sync::Arc;
use chrono::Datelike;
use mongodb::bson::oid::ObjectId;

use crate::error::ApiError;
use crate::models::costcenter::{CostCenter, CreateCostCenterRequest, UpdateCostCenterRequest};
use crate::models::users::User;
use crate::repository::{CostCenterRepository, CustomerRepository, UserRepository};

#[derive(Clone)]
pub struct CostCenterService {
    repo: Arc<CostCenterRepository>,
    customer_repo: Arc<CustomerRepository>,
    user_repo: Arc<UserRepository>,
}

impl CostCenterService {
    pub fn new(repo: CostCenterRepository, customer_repo: CustomerRepository, user_repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
            customer_repo: Arc::new(customer_repo),
            user_repo: Arc::new(user_repo),
        }
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> Result<User, ApiError> {
        self.user_repo.get_user_by_id(user_id).await
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?
            .ok_or_else(|| ApiError::NotFound("User not found".to_string()))
    }

    /// Generates: {CustomerCode}{YY}-{Series}{sequence:06}
    /// Series advances A→B→C after every 999,999 numbers.
    /// Sequence digits are always exactly 6: 000001 → 999999, then B000001 → B999999, etc.
    async fn generate_cost_center_number(&self, customer_id: &ObjectId) -> Result<String, ApiError> {
        let customer = self.customer_repo.find_by_id(&customer_id.to_string()).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))?;

        let code = if customer.customer_code.is_empty() {
            "CC".to_string()
        } else {
            customer.customer_code.clone()
        };

        let now = chrono::Utc::now();
        let fy_suffix = format!("{:02}", now.year() % 100);

        let raw_sequence = self.customer_repo.get_next_cost_center_sequence(customer_id).await?;

        // Derive series letter and 6-digit number from raw sequence.
        // raw_sequence 1–999999   → A000001–A999999
        // raw_sequence 1000000–1999998 → B000001–B999999  (etc.)
        let idx = (raw_sequence - 1) as u64;
        let series_index = (idx / 999_999) as usize;
        let digits = (idx % 999_999) + 1; // always 1–999999

        if series_index >= 26 {
            return Err(ApiError::ValidationError(
                "Cost center sequence exhausted (exceeded Z series)".to_string()
            ));
        }

        let series_letter = (b'A' + series_index as u8) as char;

        Ok(format!("{}-Y{}-{}{:03}", code, fy_suffix, series_letter, digits))
    }

    pub async fn create_cost_center(&self, req: CreateCostCenterRequest, org_id: ObjectId) -> Result<CostCenter, ApiError> {
        let customer_id = ObjectId::parse_str(&req.customer_id)
            .map_err(|_| ApiError::ValidationError("Invalid customer ID".to_string()))?;

        let cost_center_number = self.generate_cost_center_number(&customer_id).await?;

        let cost_center = CostCenter {
            id: None,
            project_name: req.project_name,
            cost_center_number,
            customer_id: Some(customer_id),
            organisation_id: Some(org_id),
            status: if req.status.is_empty() { "Active".to_string() } else { req.status },
            description: req.description,
        };

        self.repo.create(cost_center).await
    }

    pub async fn get_cost_centers_by_org(&self, org_id: &ObjectId) -> Result<Vec<CostCenter>, ApiError> {
        self.repo.find_by_organisation(org_id).await
    }

    pub async fn get_cost_center_by_id(&self, id: &str) -> Result<Option<CostCenter>, ApiError> {
        self.repo.find_by_id(id).await
    }

    pub async fn update_cost_center(&self, id: &str, req: UpdateCostCenterRequest) -> Result<Option<CostCenter>, ApiError> {
        self.repo.update(id, req).await
    }

    pub async fn delete_cost_center(&self, id: &str) -> Result<bool, ApiError> {
        self.repo.delete(id).await
    }
}
