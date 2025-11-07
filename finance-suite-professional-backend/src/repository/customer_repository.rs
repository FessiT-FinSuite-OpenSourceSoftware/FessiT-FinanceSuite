use mongodb::bson::{doc, oid::ObjectId, DateTime as BsonDateTime, to_bson};
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

    pub async fn create(&self, req: CreateCustomerRequest) -> Result<Customer, ApiError> {
        let mut customer = Customer::new(req);

        let result = self.collection.insert_one(&customer, None).await?;
        customer.id = result.inserted_id.as_object_id();
        Ok(customer)
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

        Ok(self.collection.find_one(filter, None).await?)
    }

    pub async fn update(&self, id: &str, req: UpdateCustomerRequest) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": object_id };

        // Initialize $set document with updatedAt only
        let mut set_doc = doc! {
            "updatedAt": BsonDateTime::now()
        };

        if let Some(name) = req.customer_name {
            set_doc.insert("customerName", name);
        }
        if let Some(company) = req.company_name {
            set_doc.insert("companyName", company);
        }
        if let Some(gst) = req.gst_in {
            set_doc.insert("gstIN", gst);
        }
        if let Some(addresses) = req.addresses {
            // Serialize addresses to BSON
            set_doc.insert(
                "addresses",
                to_bson(&addresses).map_err(|e| ApiError::InternalServerError(e.to_string()))?,
            );
        }
        if let Some(country) = req.country {
            set_doc.insert("country", country);
        }
        if let Some(phone) = req.phone {
            set_doc.insert("phone", phone);
        }
        if let Some(email) = req.email {
            set_doc.insert("email", email);
        }

        let update_doc = doc! { "$set": set_doc };

        self.collection.update_one(filter.clone(), update_doc, None).await?;

        let updated_customer = self.collection
            .find_one(filter, None)
            .await?
            .ok_or_else(|| ApiError::NotFound("Customer not found after update".to_string()))?;

        Ok(updated_customer)
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        let filter = doc! { "_id": object_id };

        let result = self.collection.delete_one(filter, None).await?;
        Ok(result.deleted_count > 0)
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
