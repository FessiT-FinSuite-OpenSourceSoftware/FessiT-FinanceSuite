use std::sync::Arc;

use mongodb::{
    bson::{doc, oid::ObjectId},
    error::Error as MongoError,
    Collection,
};

use crate::models::users::User;

// Needed for try_next()
use futures::stream::TryStreamExt;

#[derive(Clone)]
pub struct UserRepository {
    collection: Arc<Collection<User>>,
}

impl UserRepository {
    pub fn new(collection: Collection<User>) -> Self {
        Self {
            collection: Arc::new(collection),
        }
    }

    /// Create user
    pub async fn create_user(&self, mut user: User) -> Result<User, MongoError> {
        let insert_result = self.collection.insert_one(&user, None).await?;

        if let Some(id) = insert_result.inserted_id.as_object_id() {
            user.id = Some(id);
        }

        Ok(user)
    }

    /// Get users by organisation
    pub async fn get_users_by_organisation(&self, org_id: &mongodb::bson::oid::ObjectId) -> Result<Vec<User>, MongoError> {
        let filter = doc! { "organisationId": org_id };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut users = Vec::new();

        while let Some(doc) = cursor.try_next().await.unwrap_or(None) {
            users.push(doc);
        }

        Ok(users)
    }

    /// Get user by ID
    pub async fn get_user_by_id(
        &self,
        id: &str,
    ) -> Result<Option<User>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let filter = doc! { "_id": oid };
        let user = self.collection.find_one(filter, None).await?;

        Ok(user)
    }

    /// Update user
    pub async fn update_user(
        &self,
        id: &str,
        user: User,
    ) -> Result<Option<User>, MongoError> {

        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(None),
        };

        let mut user_to_update = user.clone();
        user_to_update.id = Some(oid);

        let filter = doc! { "_id": oid };

        let update_result = self
            .collection
            .replace_one(filter, user_to_update, None)
            .await?;

        if update_result.matched_count == 0 {
            Ok(None)
        } else {
            self.get_user_by_id(id).await
        }
    }

    /// Delete user
    pub async fn delete_user(&self, id: &str) -> Result<bool, MongoError> {

        let oid = match ObjectId::parse_str(id) {
            Ok(oid) => oid,
            Err(_) => return Ok(false),
        };

        let filter = doc! { "_id": oid };

        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    /// Get user by email
    pub async fn get_user_by_email(
        &self,
        email: &str,
    ) -> Result<Option<User>, MongoError> {
        let filter = doc! { "email": email };
        let user = self.collection.find_one(filter, None).await?;
        Ok(user)
    }
}