use actix_web::{get, post, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use mongodb::bson::oid::ObjectId;

use crate::{
    services::{account_service::AccountService, ledger_service::LedgerService},
    models::account::{Account, AccountType},
    utils::auth::Claims,
    utils::permissions::{check_permission, create_permission_error, Module, PermissionAction},
};

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    #[serde(rename = "accountCode")]
    pub account_code: String,
    #[serde(rename = "accountName")]
    pub account_name: String,
    #[serde(rename = "accountType")]
    pub account_type: AccountType,
    #[serde(rename = "accountCategory")]
    pub account_category: crate::models::account::AccountCategory,
    #[serde(rename = "parentAccountId")]
    pub parent_account_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountTypeQuery {
    #[serde(rename = "accountType")]
    pub account_type: Option<String>,
}

/// GET /api/v1/accounts - Get all accounts for organization
#[get("/accounts")]
pub async fn get_accounts(
    service: web::Data<AccountService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let ledger_service = http_req.app_data::<web::Data<LedgerService>>()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("LedgerService not found"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let accounts = service.get_organization_accounts(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(accounts))
}

/// GET /api/v1/accounts/balances - Get account balances by type
#[get("/accounts/balances")]
pub async fn get_account_balances(
    ledger_service: web::Data<LedgerService>,
    query: web::Query<AccountTypeQuery>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let balances = if let Some(account_type_str) = &query.account_type {
        let account_type = match account_type_str.to_lowercase().as_str() {
            "asset" => AccountType::Asset,
            "liability" => AccountType::Liability,
            "equity" => AccountType::Equity,
            "revenue" => AccountType::Revenue,
            "expense" => AccountType::Expense,
            _ => return Err(actix_web::error::ErrorBadRequest("Invalid account type")),
        };
        ledger_service.get_account_balances_by_type(&org_id, &account_type).await
            .map_err(actix_web::error::ErrorInternalServerError)?
    } else {
        // Return all account types
        let mut all_balances = Vec::new();
        for account_type in [AccountType::Asset, AccountType::Liability, AccountType::Equity, AccountType::Revenue, AccountType::Expense] {
            let mut balances = ledger_service.get_account_balances_by_type(&org_id, &account_type).await
                .map_err(actix_web::error::ErrorInternalServerError)?;
            all_balances.append(&mut balances);
        }
        all_balances
    };

    Ok(HttpResponse::Ok().json(balances))
}

/// GET /api/v1/accounts/organization-balance - Get organization balance summary
#[get("/accounts/organization-balance")]
pub async fn get_organization_balance(
    ledger_service: web::Data<LedgerService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let balance = ledger_service.get_organization_balance_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(balance))
}

/// GET /api/v1/accounts/financial-summary - Get complete financial summary
#[get("/accounts/financial-summary")]
pub async fn get_financial_summary(
    service: web::Data<AccountService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let ledger_service = http_req.app_data::<web::Data<LedgerService>>()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("LedgerService not found"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Read, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let summary = service.get_financial_summary(&org_id).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(summary))
}

/// POST /api/v1/accounts - Create a new account
#[post("/accounts")]
pub async fn create_account(
    service: web::Data<AccountService>,
    req: web::Json<CreateAccountRequest>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let ledger_service = http_req.app_data::<web::Data<LedgerService>>()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("LedgerService not found"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let parent_account_id = if let Some(parent_id_str) = &req.parent_account_id {
        Some(ObjectId::parse_str(parent_id_str)
            .map_err(|_| actix_web::error::ErrorBadRequest("Invalid parent account ID"))?)
    } else {
        None
    };

    let account = Account {
        id: None,
        organisation_id: org_id,
        account_code: req.account_code.clone(),
        account_name: req.account_name.clone(),
        account_type: req.account_type.clone(),
        account_category: req.account_category.clone(),
        parent_account_id,
        is_active: true,
        balance: 0,
        description: req.description.clone(),
        created_at: mongodb::bson::DateTime::now(),
        updated_at: mongodb::bson::DateTime::now(),
        created_by: user.id,
    };

    let created_account = service.create_account(account).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(created_account))
}

/// POST /api/v1/accounts/initialize - Initialize default accounts for organization
#[post("/accounts/initialize")]
pub async fn initialize_accounts(
    service: web::Data<AccountService>,
    http_req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let claims = http_req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing claims"))?;

    let ledger_service = http_req.app_data::<web::Data<LedgerService>>()
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("LedgerService not found"))?;

    let user = ledger_service.get_user_by_id(&claims.sub).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    check_permission(&user.permissions, Module::Invoice, PermissionAction::Write, user.is_admin)
        .map_err(|e| actix_web::error::ErrorForbidden(create_permission_error(&e)))?;

    let org_id = user.organisation_id
        .ok_or_else(|| actix_web::error::ErrorBadRequest("User has no organisation"))?;

    let accounts = service.initialize_organization_accounts(&org_id, user.id.as_ref()).await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(accounts))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(get_accounts)
        .service(get_account_balances)
        .service(get_organization_balance)
        .service(get_financial_summary)
        .service(create_account)
        .service(initialize_accounts);
}