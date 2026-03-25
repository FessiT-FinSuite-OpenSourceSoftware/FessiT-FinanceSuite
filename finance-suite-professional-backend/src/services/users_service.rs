use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};

use crate::{
    models::users::{User, UserResponse},
    repository::user_repository::UserRepository,
    utils::{generate_token, generate_refresh_token, verify_refresh_token, JwtConfig},
};

#[derive(Clone)]
pub struct UserService {
    repo: Arc<UserRepository>,
}

impl UserService {
    pub fn new(repo: UserRepository) -> Self {
        Self {
            repo: Arc::new(repo),
        }
    }

    /// Create user
    pub async fn create_user(&self, mut user: User) -> anyhow::Result<User> {

    // hash password
    let hashed = hash(&user.password, DEFAULT_COST)?;

    user.password = hashed;

    let created = self.repo.create_user(user).await?;

    Ok(created)
}

    /// Get users by organisation
    pub async fn get_users_by_organisation(&self, org_id: &mongodb::bson::oid::ObjectId) -> anyhow::Result<Vec<User>> {
        let users = self.repo.get_users_by_organisation(org_id).await?;
        Ok(users)
    }

    /// Get user by id
    pub async fn get_user_by_id(&self, id: &str) -> anyhow::Result<Option<User>> {
        let user = self.repo.get_user_by_id(id).await?;
        Ok(user)
    }

    /// Get user by email
    pub async fn get_user_by_email(&self, email: &str) -> anyhow::Result<User> {
        let user = self.repo.get_user_by_email(email).await?
            .ok_or_else(|| anyhow::anyhow!("User with email '{}' not found", email))?;
        Ok(user)
    }

    /// Update user
    pub async fn update_user(
        &self,
        id: &str,
        mut user: User,
    ) -> anyhow::Result<Option<User>> {
        // Hash password if it's not empty and not already hashed
        if !user.password.is_empty() && !user.password.starts_with("$2") {
            let hashed = hash(&user.password, DEFAULT_COST)?;
            user.password = hashed;
        }
        let updated = self.repo.update_user(id, user).await?;
        Ok(updated)
    }

    /// Delete user
    pub async fn delete_user(&self, id: &str) -> anyhow::Result<bool> {
        let deleted = self.repo.delete_user(id).await?;
        Ok(deleted)
    }

    /// Login user and return JWT token
    pub async fn login(&self, email: &str, password: &str) -> anyhow::Result<(String, String, UserResponse)> {
        let user = self.repo.get_user_by_email(email).await?
            .ok_or_else(|| anyhow::anyhow!("Invalid email or password"))?;

        if !user.is_active {
            return Err(anyhow::anyhow!("User account is inactive"));
        }

        let password_valid = verify(password, &user.password)?;
        if !password_valid {
            return Err(anyhow::anyhow!("Invalid email or password"));
        }

        let config = JwtConfig::from_env();
        let org_id = user.organisation_id
            .map(|id| id.to_string())
            .unwrap_or_default();
        let user_id = user.id.map(|id| id.to_string()).unwrap_or_default();

        let token = generate_token(
            &user_id,
            &user.email,
            &user.name,
            &user.role,
            &org_id,
            &config,
        )?;

        let refresh_token = generate_refresh_token(&user_id, &config)?;

        let user_response = UserResponse {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organisation_id: user.organisation_id,
            permissions: user.permissions,
            is_admin: user.is_admin,
            is_active: user.is_active,
        };

        Ok((token, refresh_token, user_response))
    }

    /// Refresh access token using refresh token
    pub async fn refresh_access_token(&self, refresh_token: &str) -> anyhow::Result<(String, String)> {
        let config = JwtConfig::from_env();
        let claims = verify_refresh_token(refresh_token, &config)?;

        let user = self.repo.get_user_by_id(&claims.sub).await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))?;

        if !user.is_active {
            return Err(anyhow::anyhow!("User account is inactive"));
        }

        let org_id = user.organisation_id
            .map(|id| id.to_string())
            .unwrap_or_default();

        let new_token = generate_token(
            &claims.sub,
            &user.email,
            &user.name,
            &user.role,
            &org_id,
            &config,
        )?;

        let new_refresh_token = generate_refresh_token(&claims.sub, &config)?;

        Ok((new_token, new_refresh_token))
    }
}