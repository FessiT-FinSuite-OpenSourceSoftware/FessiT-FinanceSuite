use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, errors::ErrorKind};
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // user id
    pub email: String,
    pub name: String,
    pub role: String,
    pub organisation_id: String,
    pub exp: i64,              // expiration time
    pub iat: i64,              // issued at
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshClaims {
    pub sub: String,           // user id
    pub exp: i64,
    pub iat: i64,
}

pub struct JwtConfig {
    pub secret: String,
    pub expiration_hours: i64,
    pub refresh_expiration_days: i64,
}

impl JwtConfig {
    pub fn from_env() -> Self {
        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
        let expiration_hours = std::env::var("JWT_EXPIRATION_HOURS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(24);
        let refresh_expiration_days = std::env::var("JWT_REFRESH_EXPIRATION_DAYS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(7);

        Self {
            secret,
            expiration_hours,
            refresh_expiration_days,
        }
    }
}

pub fn generate_token(
    user_id: &str,
    email: &str,
    name: &str,
    role: &str,
    organisation_id: &str,
    config: &JwtConfig,
) -> anyhow::Result<String> {
    let now = Utc::now();
    let expiration = now + Duration::hours(config.expiration_hours);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        name: name.to_string(),
        role: role.to_string(),
        organisation_id: organisation_id.to_string(),
        iat: now.timestamp(),
        exp: expiration.timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.secret.as_ref()),
    )?;

    Ok(token)
}

pub fn generate_refresh_token(
    user_id: &str,
    config: &JwtConfig,
) -> anyhow::Result<String> {
    let now = Utc::now();
    let expiration = now + Duration::days(config.refresh_expiration_days);

    let claims = RefreshClaims {
        sub: user_id.to_string(),
        iat: now.timestamp(),
        exp: expiration.timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.secret.as_ref()),
    )?;

    Ok(token)
}

pub fn verify_token(token: &str, config: &JwtConfig) -> anyhow::Result<Claims> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.secret.as_ref()),
        &Validation::default(),
    ).map_err(|e| {
        if e.kind() == &ErrorKind::ExpiredSignature {
            anyhow::anyhow!("SESSION_EXPIRED")
        } else {
            anyhow::anyhow!("INVALID_TOKEN")
        }
    })?;

    Ok(data.claims)
}

pub fn verify_refresh_token(token: &str, config: &JwtConfig) -> anyhow::Result<RefreshClaims> {
    let data = decode::<RefreshClaims>(
        token,
        &DecodingKey::from_secret(config.secret.as_ref()),
        &Validation::default(),
    ).map_err(|e| {
        if e.kind() == &ErrorKind::ExpiredSignature {
            anyhow::anyhow!("REFRESH_TOKEN_EXPIRED")
        } else {
            anyhow::anyhow!("INVALID_REFRESH_TOKEN")
        }
    })?;

    Ok(data.claims)
}

pub fn extract_token_from_header(auth_header: &str) -> Option<String> {
    if auth_header.starts_with("Bearer ") {
        Some(auth_header[7..].to_string())
    } else {
        None
    }
}
