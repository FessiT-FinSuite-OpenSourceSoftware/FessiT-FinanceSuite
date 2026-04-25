use actix_web::{
    delete, get, post, put,
    web::{self, Json, Path},
    HttpResponse, Responder, HttpRequest, HttpMessage,
};
use serde_json::json;

use crate::{
    models::users::{CreateUserRequest, UpdateUserRequest, LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse},
    services::UserService,
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

/// POST /api/v1/users
#[post("/users")]
pub async fn create_user(
    service: web::Data<UserService>,
    req: Json<CreateUserRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    // Get JWT claims to get the admin's organisation_id
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    // Get admin user to get their organisation_id and permissions
    let admin_user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Admin user not found"))?;

    // Check permissions
    check_permission(&admin_user.permissions, Module::Users, PermissionAction::Write, admin_user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let mut new_user = req.into_inner();
    
    // Set the new user's organisation_id to be the same as the admin's
    new_user.organisation_id = admin_user.organisation_id;

    let user = service
        .create_user(new_user)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    Ok(HttpResponse::Created().json(user))
}

/// GET /api/v1/users
#[get("/users")]
pub async fn list_users(
    service: web::Data<UserService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Users, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let users = service
        .get_users_by_organisation(&user.organisation_id.unwrap())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    Ok(HttpResponse::Ok().json(users))
}

/// GET /api/v1/users/{id}
#[get("/users/{id}")]
pub async fn get_user(
    service: web::Data<UserService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Users, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    let maybe_user = service
        .get_user_by_id(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if let Some(target_user) = maybe_user {
        // Check if target user belongs to same organisation
        if target_user.organisation_id != user.organisation_id {
            return Ok(HttpResponse::NotFound().json(json!({
                "message": "User not found"
            })));
        }
        Ok(HttpResponse::Ok().json(target_user))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "User not found"
        })))
    }
}

/// PUT /api/v1/users/{id}
#[put("/users/{id}")]
pub async fn update_user(
    service: web::Data<UserService>,
    id: Path<String>,
    req: Json<UpdateUserRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Users, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    // Get existing user to preserve organisation_id and check organisation match
    let existing_user = service
        .get_user_by_id(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if existing_user.is_none() {
        return Ok(HttpResponse::NotFound().json(json!({
            "message": "User not found"
        })));
    }

    let existing = existing_user.unwrap();
    // Check if target user belongs to same organisation
    if existing.organisation_id != user.organisation_id {
        return Ok(HttpResponse::NotFound().json(json!({
            "message": "User not found"
        })));
    }

    let mut update_data = req.into_inner();
    update_data.organisation_id = existing.organisation_id;

    let maybe_updated = service
        .update_user(&id, update_data)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if let Some(updated) = maybe_updated {
        Ok(HttpResponse::Ok().json(updated))
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "User not found"
        })))
    }
}

/// GET /api/v1/profile - Get current user's profile
#[get("/profile")]
pub async fn get_profile(
    service: web::Data<UserService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    // Convert to UserResponse (without password)
    let profile = crate::models::users::UserResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisation_id: user.organisation_id,
        permissions: user.permissions,
        is_admin: user.is_admin,
        is_active: user.is_active,
    };

    Ok(HttpResponse::Ok().json(profile))
}

/// DELETE /api/v1/users/{id}
#[delete("/users/{id}")]
pub async fn delete_user(
    service: web::Data<UserService>,
    id: Path<String>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    check_permission(&user.permissions, Module::Users, PermissionAction::Delete, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let id = id.into_inner();

    // Check if target user belongs to same organisation before deleting
    let target_user = service
        .get_user_by_id(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if let Some(target) = target_user {
        if target.organisation_id != user.organisation_id {
            return Ok(HttpResponse::NotFound().json(json!({
                "message": "User not found"
            })));
        }
    }

    let deleted = service
        .delete_user(&id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    if deleted {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(json!({
            "message": "User not found"
        })))
    }
}

/// GET /api/v1/auth/verify
#[get("/auth/verify")]
pub async fn verify_token_handler(
    service: web::Data<UserService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = service
        .get_user_by_id(&claims.sub)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("User not found"))?;

    let profile = crate::models::users::UserResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisation_id: user.organisation_id,
        permissions: user.permissions,
        is_admin: user.is_admin,
        is_active: user.is_active,
    };

    Ok(HttpResponse::Ok().json(json!({ "user": profile })))
}

/// POST /api/v1/auth/login
#[post("/auth/login")]
pub async fn login(
    service: web::Data<UserService>,
    req: Json<LoginRequest>,
) -> actix_web::Result<impl Responder> {
    let (token, refresh_tok, user) = service
        .login(&req.email, &req.password)
        .await
        .map_err(|e| actix_web::error::ErrorUnauthorized(e.to_string()))?;

    let response = LoginResponse { token, refresh_token: refresh_tok, user };
    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/v1/auth/refresh
#[post("/auth/refresh")]
pub async fn refresh_token(
    service: web::Data<UserService>,
    req: Json<RefreshTokenRequest>,
) -> actix_web::Result<impl Responder> {
    let (token, refresh_token) = service
        .refresh_access_token(&req.refresh_token)
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("REFRESH_TOKEN_EXPIRED") {
                actix_web::error::ErrorUnauthorized(
                    json!({
                        "error": "Refresh token expired. Please login again.",
                        "code": "REFRESH_TOKEN_EXPIRED"
                    }).to_string()
                )
            } else {
                actix_web::error::ErrorUnauthorized(
                    json!({
                        "error": "Invalid refresh token. Please login again.",
                        "code": "INVALID_REFRESH_TOKEN"
                    }).to_string()
                )
            }
        })?;

    let response = RefreshTokenResponse { token, refresh_token };
    Ok(HttpResponse::Ok().json(response))
}

/// Register routes - split into public and protected
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    // Public routes (no JWT required)
    cfg.service(login)
        .service(refresh_token);
}

/// Register protected routes (JWT required)
pub fn configure_protected_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(verify_token_handler)
        .service(get_profile)
        .service(create_user)
        .service(list_users)
        .service(get_user)
        .service(update_user)
        .service(delete_user);
}