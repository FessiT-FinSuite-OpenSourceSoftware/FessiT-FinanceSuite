use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures::future::LocalBoxFuture;
use std::rc::Rc;

use crate::utils::auth::Claims;

pub struct PermissionExtractor;

impl<S, B> Transform<S, ServiceRequest> for PermissionExtractor
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = PermissionExtractorService<S>;
    type Future = std::future::Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        std::future::ready(Ok(PermissionExtractorService {
            service: Rc::new(service),
        }))
    }
}

pub struct PermissionExtractorService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for PermissionExtractorService<S>
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

        Box::pin(async move {
            // Extract claims from extensions (set by JWT middleware)
            if let Some(claims) = req.extensions().get::<Claims>().cloned() {
                // Store claims in extensions for use in handlers
                req.extensions_mut().insert(claims);
            }
            service.call(req).await
        })
    }
}
