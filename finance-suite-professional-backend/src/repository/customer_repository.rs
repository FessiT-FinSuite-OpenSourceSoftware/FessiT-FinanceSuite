<<<<<<< HEAD
use mongodb::bson::{doc, oid::ObjectId, DateTime as BsonDateTime, to_bson};
use mongodb::Collection;
=======
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Collection;

>>>>>>> Phoenix-Reborn
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
<<<<<<< HEAD
        customer.id = result.inserted_id.as_object_id();
        Ok(customer)
    }

=======

        customer.id = result.inserted_id.as_object_id();

        Ok(customer)
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
>>>>>>> Phoenix-Reborn
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
<<<<<<< HEAD
        let filter = doc! { "_id": object_id };

        Ok(self.collection.find_one(filter, None).await?)
=======

        let filter = doc! { "_id": object_id };
        let customer = self.collection.find_one(filter, None).await?;

        Ok(customer)
>>>>>>> Phoenix-Reborn
    }

    pub async fn update(&self, id: &str, req: UpdateCustomerRequest) -> Result<Customer, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
<<<<<<< HEAD
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
=======

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

        self.collection
            .update_one(filter.clone(), update_doc, None)
            .await?;

        let updated_customer = self
            .collection
>>>>>>> Phoenix-Reborn
            .find_one(filter, None)
            .await?
            .ok_or_else(|| ApiError::NotFound("Customer not found after update".to_string()))?;

        Ok(updated_customer)
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
<<<<<<< HEAD
        let filter = doc! { "_id": object_id };

        let result = self.collection.delete_one(filter, None).await?;
=======
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

>>>>>>> Phoenix-Reborn
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
