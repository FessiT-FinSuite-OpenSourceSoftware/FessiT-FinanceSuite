use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// Permission block for a module
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Permission {
    #[serde(default)]
    pub read: bool,

    #[serde(default)]
    pub write: bool,

    #[serde(default)]
    pub delete: bool,
}

/// All module permissions for a user
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct UserPermissions {

    #[serde(default)]
    pub organisation: Permission,

    #[serde(default)]
    pub invoice: Permission,

    #[serde(default)]
    pub expenses: Permission,

    #[serde(default)]
    pub users: Permission,

    #[serde(default, rename = "purchaseOrders")]
    pub purchase_orders: Permission,

    #[serde(default)]
    pub customers: Permission,

    #[serde(default)]
    pub products: Permission,
}

/// The User document stored in MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {

    /// MongoDB document _id
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(default)]
    pub name: String,

    #[serde(default)]
    pub email: String,

    #[serde(default)]
    pub password: String,

     #[serde(default)]
    pub role: String,

    /// Organisation reference
    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,

    /// Permissions block
    #[serde(default)]
    pub permissions: UserPermissions,

    #[serde(default)]
    pub is_admin: bool,

    #[serde(default)]
    pub is_active: bool,

    #[serde(default)]
    pub created_at: String,

    #[serde(default)]
    pub updated_at: String,
}

/// For creation (POST /users)
pub type CreateUserRequest = User;

/// For updates (PUT /users/{id})
pub type UpdateUserRequest = User;

/// Login request
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Login response with JWT token
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

/// User response (without password)
#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub email: String,
    pub role: String,
    #[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
    pub organisation_id: Option<ObjectId>,
    pub permissions: UserPermissions,
    pub is_admin: bool,
    pub is_active: bool,
}

/// Refresh token request
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

/// Refresh token response
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshTokenResponse {
    pub token: String,
    pub refresh_token: String,
}