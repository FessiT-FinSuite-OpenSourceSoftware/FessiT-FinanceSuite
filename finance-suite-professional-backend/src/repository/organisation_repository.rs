use mongodb::bson::{doc,oid::ObjectId};
use mongodb::Collection;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest,UpdateOrganizationRequest,Organisation};

#[derive(Clone)]
pub struct OrganisationRepository{
    collection:Collection<Organisation>,
}

impl OrganisationRepository{
    pub fn new(collection:Collection<Organisation>)-> Self{
        Self{collection}
    }
    pub async fn create(&self,req:CreateOrganisationRequest)->Result<Organisation,ApiError>{
        let mut organisation = Organisation::new(req);
        let result = self.collection.insert_one(&organisation,None).await?;
        organisation.id = result.inserted_id.as_object_id();
        Ok(organisation)
    }
    pub async fn find_all(&self)-> Result<Vec<Organisation>,ApiError>{
        let mut cursor = self.collection.find(None,None).await?;
        let mut organisation = Vec::new();
        while cursor.advance().await?{
            organisation.push(cursor.deserialize_current()?);
        }
        Ok(organisation)
    }
    pub async fn find_by_email(&self, email: &str) -> Result<Option<Organisation>, ApiError> {
        let filter = doc! { "email": email };
        let result = self
            .collection
            .find_one(filter, None)
            .await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        Ok(result)
    }
 pub async fn get_organisation_by_email(&self, email: &str) -> Result<Organisation, ApiError> {
    let filter = doc! { "email": email };

    match self.collection.find_one(filter, None).await? {
        Some(organisation) => Ok(organisation),
        None => Err(ApiError::NotFound(format!(
            "Customer with email '{}' not found",
            email
        ))),
    }
}


    pub async fn find_by_id(&self, id: &str) -> Result<Option<Organisation>, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };
        let organisation = self.collection.find_one(filter, None).await?;

        Ok(organisation)
    }
    pub async fn update(&self, id: &str, req: UpdateOrganizationRequest) -> Result<Organisation, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };

        let mut update_doc = doc! {
            "$set": {
                "updatedAt": mongodb::bson::DateTime::now()
            }
        };

        if let Some(organisation_name) = req.organisation_name {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("organizationName", organisation_name);
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

        let update_organisation = self
            .collection
            .find_one(filter, None)
            .await?
            .ok_or_else(|| ApiError::NotFound("Customer not found after update".to_string()))?;

        Ok(update_organisation)
    }
    
    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        println!("🧩 Trying to delete ObjectId: {}", object_id);

        let filter = doc! { "_id": object_id };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }
}