use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use serde::Serialize;
use std::fmt;

#[derive(Debug)]
pub enum ApiError {
    DatabaseError(String),
    ValidationError(String),
    NotFound(String),
    InternalServerError(String),
    BadRequest(String),  // Added this variant
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            ApiError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ApiError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ApiError::InternalServerError(msg) => write!(f, "Internal server error: {}", msg),
            ApiError::BadRequest(msg) => write!(f, "Bad request: {}", msg),  // Added this
        }
    }
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::ValidationError(_) => StatusCode::BAD_REQUEST,
            ApiError::NotFound(_) => StatusCode::NOT_FOUND,
            ApiError::InternalServerError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,  // Added this
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status_code = self.status_code();
        let error_response = ErrorResponse {
            error: match self {
                ApiError::DatabaseError(_) => "DATABASE_ERROR".to_string(),
                ApiError::ValidationError(_) => "VALIDATION_ERROR".to_string(),
                ApiError::NotFound(_) => "NOT_FOUND".to_string(),
                ApiError::InternalServerError(_) => "INTERNAL_SERVER_ERROR".to_string(),
                ApiError::BadRequest(_) => "BAD_REQUEST".to_string(),  // Added this
            },
            message: self.to_string(),
        };

        HttpResponse::build(status_code).json(error_response)
    }
}

impl From<mongodb::error::Error> for ApiError {
    fn from(err: mongodb::error::Error) -> Self {
        ApiError::DatabaseError(err.to_string())
    }
}

impl From<validator::ValidationErrors> for ApiError {
    fn from(err: validator::ValidationErrors) -> Self {
        ApiError::ValidationError(err.to_string())
    }
}