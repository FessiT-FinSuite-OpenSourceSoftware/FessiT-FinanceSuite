use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, http::Method,
};
use futures::future::LocalBoxFuture;
use std::rc::Rc;
use serde_json::json;

use crate::utils::auth::{extract_token_from_header, verify_token, JwtConfig};

pub struct JwtMiddleware;

impl<S, B> Transform<S, ServiceRequest> for JwtMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = JwtMiddlewareService<S>;
    type Future = std::future::Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        std::future::ready(Ok(JwtMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct JwtMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for JwtMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        // Allow CORS preflight requests to pass through without JWT validation
        if req.method() == Method::OPTIONS {
            return Box::pin(async move { service.call(req).await });
        }

        Box::pin(async move {
            let auth_header = req
                .headers()
                .get("Authorization")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string());

            if let Some(auth_header) = auth_header {
                if let Some(token) = extract_token_from_header(&auth_header) {
                    let config = JwtConfig::from_env();
                    match verify_token(&token, &config) {
                        Ok(claims) => {
                            req.extensions_mut().insert(claims);
                            service.call(req).await
                        }
                        Err(e) => {
                            let error_msg = e.to_string();
                            if error_msg.contains("SESSION_EXPIRED") {
                                Err(actix_web::error::ErrorUnauthorized(
                                    json!({
                                        "error": "Your session has expired. Please login again.",
                                        "code": "SESSION_EXPIRED"
                                    }).to_string()
                                ))
                            } else {
                                Err(actix_web::error::ErrorUnauthorized(
                                    json!({
                                        "error": "Invalid or malformed token. Please login again.",
                                        "code": "INVALID_TOKEN"
                                    }).to_string()
                                ))
                            }
                        }
                    }
                } else {
                    Err(actix_web::error::ErrorUnauthorized(
                        json!({
                            "error": "Invalid token format. Use: Authorization: Bearer <token>",
                            "code": "INVALID_TOKEN_FORMAT"
                        }).to_string()
                    ))
                }
            } else {
                Err(actix_web::error::ErrorUnauthorized(
                    json!({
                        "error": "Missing authorization header. Please login.",
                        "code": "MISSING_TOKEN"
                    }).to_string()
                ))
            }
        })
    }
}
