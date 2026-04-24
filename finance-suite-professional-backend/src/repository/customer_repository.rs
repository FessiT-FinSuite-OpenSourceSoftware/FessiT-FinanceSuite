use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Collection;

use crate::error::ApiError;
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};

#[derive(Clone)]
pub struct CustomerRepository {
    collection: Collection<Customer>,
}

impl CustomerRepository {
    pub fn new(collection: Collection<Customer>) -> Self {
        Self { collection }
    }

    pub async fn create(&self, req: CreateCustomerRequest, org_id: Option<ObjectId>) -> Result<Customer, ApiError> {
        let mut customer = Customer::new(req);
        customer.organisation_id = org_id;

        let result = self.collection.insert_one(&customer, None).await?;

        customer.id = result.inserted_id.as_object_id();

        Ok(customer)
    }

    pub async fn find_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<Customer>, ApiError> {
        let filter = doc! { "organisationId": org_id };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut customers = Vec::new();

        while cursor.advance().await? {
            customers.push(cursor.deserialize_current()?);
        }

        Ok(customers)
    }

    pub async fn search_by_organisation(&self, query: &str, org_id: &ObjectId) -> Result<Vec<Customer>, ApiError> {
        let filter = doc! {
            "organisationId": org_id,
            "$or": [
                { "customerName": { "$regex": query, "$options": "i" } },
                { "companyName": { "$regex": query, "$options": "i" } },
                { "email": { "$regex": query, "$options": "i" } },
                { "gstIN": { "$regex": query, "$options": "i" } }
            ]
        };

        let mut cursor = self.collection.find(filter, None).await?;
        let mut customers = Vec::new();

        while cursor.advance().await? {
            customers.push(cursor.deserialize_current()?);
        }

        Ok(customers)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<Customer>, ApiError> {
        let filter = doc! { "email": email };
        let result = self
            .collection
            .find_one(filter, None)
            .await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        Ok(result)
    }

    pub async fn find_by_gstin(&self, gstin: &str) -> Result<Option<Customer>, ApiError> {
        let filter = doc! { "gstIN": gstin };
        let result = self
            .collection
            .find_one(filter, None)
            .await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        Ok(result)
    }
    pub async fn find_all(&self) -> Result<Vec<Customer>, ApiError> {
        let mut cursor = self.collection.find(None, None).await?;
        let mut customers = Vec::new();

        while cursor.advance().await? {
            customers.push(cursor.deserialize_current()?);
        }

        Ok(customers)
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Customer>, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };
        let customer = self.collection.find_one(filter, None).await?;

        Ok(customer)
    }

    /// Returns only the display name (companyName) for a customer id — cheap lookup.
    pub async fn get_display_name(&self, id: &ObjectId) -> Result<Option<String>, ApiError> {
        let result = self.collection
            .find_one(doc! { "_id": id }, None)
            .await?;
        Ok(result.map(|c| {
            if !c.company_name.is_empty() { c.company_name } else { c.customer_name }
        }))
    }

    pub async fn update(&self, id: &str, req: UpdateCustomerRequest) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };

        let mut update_doc = doc! {
            "$set": {
                "updatedAt": mongodb::bson::DateTime::now()
            }
        };

        if let Some(customer_name) = req.customer_name {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("customerName", customer_name);
        }
        if let Some(company_name) = req.company_name {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("companyName", company_name);
        }
        if let Some(gst_in) = req.gst_in {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("gstIN", gst_in);
        }
        if let Some(customer_code) = req.customer_code {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("CustomerCode", customer_code);
        }
        if let Some(addresses) = req.addresses {
            let addresses_bson = mongodb::bson::to_bson(&addresses)
                .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("addresses", addresses_bson);
        }
        if let Some(country) = req.country {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("country", country);
        }
        if let Some(country_code) = req.country_code {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("countryCode", country_code);
        }
        if let Some(is_active) = req.is_active {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("isActive", is_active);
        }
        if let Some(is_vendor) = req.isvendor {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("is_vendor_too", is_vendor);
        }

        if let Some(phone) = req.phone {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("phone", phone);
        }
        if let Some(email) = req.email {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("email", email);
        }
        if let Some(projects) = req.projects {
            let projects_bson = mongodb::bson::to_bson(&projects)
                .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("projects", projects_bson);
        }

        self.collection
            .update_one(filter.clone(), update_doc, None)
            .await?;

        let updated_customer = self
            .collection
            .find_one(filter, None)
            .await?
            .ok_or_else(|| ApiError::NotFound("Customer not found after update".to_string()))?;

        Ok(updated_customer)
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        println!("🧩 Trying to delete ObjectId: {}", object_id);

        let filter = doc! { "_id": object_id };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    pub async fn delete_by_gstin(&self, gstin: &str) -> Result<bool, ApiError> {
        println!("🧩 Trying to delete customer with GSTIN: {}", gstin);

        let filter = doc! { "gstIN": gstin };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    pub async fn delete_by_email(&self, email: &str) -> Result<bool, ApiError> {
        println!("🧩 Trying to delete customer with email: {}", email);

        let filter = doc! { "email": email };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    pub async fn get_next_cost_center_sequence(&self, customer_id: &ObjectId) -> Result<i32, ApiError> {
        let filter = doc! { "_id": customer_id };
        let update = doc! { "$inc": { "lastCostCenterSequence": 1 } };
        let options = mongodb::options::FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();
        let result = self.collection.find_one_and_update(filter, update, options).await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        match result {
            Some(customer) => Ok(customer.last_cost_center_sequence),
            None => Err(ApiError::NotFound("Customer not found".to_string())),
        }
    }

    pub async fn get_all_projects_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<mongodb::bson::Document>, ApiError> {
        let filter = doc! { "organisationId": org_id };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut projects = Vec::new();

        while cursor.advance().await? {
            let customer = cursor.deserialize_current()?;
            let customer_id = customer.id.map(|id| id.to_hex()).unwrap_or_default();
            let customer_name = customer.customer_name.clone();
            for (project_index, project) in customer.projects.iter().enumerate() {
                let mut pdoc = mongodb::bson::to_document(project)
                    .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
                pdoc.insert("customerId", customer_id.clone());
                pdoc.insert("customerName", customer_name.clone());
                pdoc.insert("projectIndex", project_index as i64);
                projects.push(pdoc);
            }
        }

        Ok(projects)
    }

    pub async fn add_project(&self, customer_id: &str, project: crate::models::customer::Project) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(customer_id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let project_bson = mongodb::bson::to_bson(&project)
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
        let filter = doc! { "_id": object_id };
        let update = doc! { "$push": { "projects": project_bson } };
        self.collection.update_one(filter.clone(), update, None).await?;
        self.collection.find_one(filter, None).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))
    }

    pub async fn update_project(&self, customer_id: &str, index: usize, project: crate::models::customer::Project) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(customer_id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": object_id };
        let mut customer = self.collection.find_one(filter.clone(), None).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))?;
        if index >= customer.projects.len() {
            return Err(ApiError::NotFound("Project index out of range".to_string()));
        }
        customer.projects[index] = project;
        let projects_bson = mongodb::bson::to_bson(&customer.projects)
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
        let update = doc! { "$set": { "projects": projects_bson } };
        self.collection.update_one(filter.clone(), update, None).await?;
        self.collection.find_one(filter, None).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))
    }

    pub async fn delete_project(&self, customer_id: &str, index: usize) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(customer_id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": object_id };
        let mut customer = self.collection.find_one(filter.clone(), None).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))?;
        if index >= customer.projects.len() {
            return Err(ApiError::NotFound("Project index out of range".to_string()));
        }
        customer.projects.remove(index);
        let projects_bson = mongodb::bson::to_bson(&customer.projects)
            .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
        let update = doc! { "$set": { "projects": projects_bson } };
        self.collection.update_one(filter.clone(), update, None).await?;
        self.collection.find_one(filter, None).await?
            .ok_or_else(|| ApiError::NotFound("Customer not found".to_string()))
    }

    pub async fn search(&self, query: &str) -> Result<Vec<Customer>, ApiError> {
        let filter = doc! {
            "$or": [
                { "customerName": { "$regex": query, "$options": "i" } },
                { "companyName": { "$regex": query, "$options": "i" } },
                { "email": { "$regex": query, "$options": "i" } },
                { "gstIN": { "$regex": query, "$options": "i" } }
            ]
        };

        let mut cursor = self.collection.find(filter, None).await?;
        let mut customers = Vec::new();

        while cursor.advance().await? {
            customers.push(cursor.deserialize_current()?);
        }

        Ok(customers)
    }
}
