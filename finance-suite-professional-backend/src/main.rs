mod db;
mod error;
mod handlers;
mod models;
mod repository;
mod services;
mod utils;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpResponse, HttpServer};
use dotenv::dotenv;
use std::env;

use db::MongoDbClient;
use handlers::{
    configure_customer_routes, configure_expense_routes, configure_invoice_routes,
    configure_incoming_invoice_routes,
    configure_organisation_routes, configure_organisation_public_routes,
    configure_user_routes, configure_protected_user_routes, configure_purchase_order_routes,
    configure_cost_center_routes,
};
use repository::{
    CustomerRepository, ExpenseRepository, InvoiceRepository, IncomingInvoiceRepository,
    OrganisationRepository, UserRepository, PurchaseOrderRepository, CostCenterRepository,
};
use services::{CustomerService, ExpenseService, InvoiceService, IncomingInvoiceService, OrganisationService, UserService, PurchaseOrderService, CostCenterService};
use utils::jwt_middleware::JwtMiddleware;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("Invalid SERVER_PORT");

    let cors_origin =
        env::var("CORS_ALLOWED_ORIGIN").unwrap_or_else(|_| "http://localhost:5174".to_string());

    let db_client = MongoDbClient::new()
        .await
        .expect("❌ Failed to connect to MongoDB");

    log::info!("✅ Connected to MongoDB successfully");

    // 🔹 Users
    let user_collection = db_client.get_user_collection();
    let user_repository = UserRepository::new(user_collection);
    let user_service = UserService::new(user_repository.clone());

    // 🔹 Customers
    let customer_collection = db_client.get_customers_collection();
    let customer_repository = CustomerRepository::new(customer_collection);
    let customer_service = CustomerService::new(customer_repository.clone(), user_repository.clone());

    // 🔹 Organisations
    let organisation_collection = db_client.get_organisation_collection();
    let organisation_repository = OrganisationRepository::new(organisation_collection);
    let organisation_service = OrganisationService::new(organisation_repository.clone(), user_service.clone());

    // 🔹 Invoices
    let invoice_collection = db_client.get_invoice_collection();
    let invoice_repository = InvoiceRepository::new(invoice_collection);
    let invoice_service = InvoiceService::new(invoice_repository, organisation_repository.clone(), user_repository.clone());

    // 🔹 Expenses
    let expense_collection = db_client.get_expense_collection();
    let expense_repository = ExpenseRepository::new(expense_collection);
    let expense_service = ExpenseService::new(expense_repository, user_repository.clone());

    // 🔹 Purchase Orders
    let purchase_order_collection = db_client.get_purchase_order_collection();
    let purchase_order_repository = PurchaseOrderRepository::new(purchase_order_collection);
    let purchase_order_service = PurchaseOrderService::new(purchase_order_repository, user_repository.clone());

    // 🔹 Cost Centers
    let cost_center_collection = db_client.get_cost_center_collection();
    let cost_center_repository = CostCenterRepository::new(cost_center_collection);
    let cost_center_service = CostCenterService::new(cost_center_repository, customer_repository.clone(), user_repository.clone());

    // 🔹 Incoming Invoices
    let incoming_invoice_collection = db_client.get_incoming_invoice_collection();
    let incoming_invoice_repository = IncomingInvoiceRepository::new(incoming_invoice_collection);
    let incoming_invoice_service = IncomingInvoiceService::new(incoming_invoice_repository, user_repository.clone());

    log::info!("🚀 Starting server at http://{}:{}", host, port);

    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            // inject services
            .app_data(web::Data::new(customer_service.clone()))
            .app_data(web::Data::new(organisation_service.clone()))
            .app_data(web::Data::new(invoice_service.clone()))
            .app_data(web::Data::new(expense_service.clone()))
            .app_data(web::Data::new(user_service.clone()))
            .app_data(web::Data::new(purchase_order_service.clone()))
            .app_data(web::Data::new(cost_center_service.clone()))
            .app_data(web::Data::new(incoming_invoice_service.clone()))
            // health
            .route("/health", web::get().to(health_check))
            // all APIs under /api/v1
            .service(
                web::scope("/api/v1")
                    .configure(configure_user_routes) // Public: login, refresh
                    .configure(configure_organisation_public_routes) // Public: create org
                    .service(
                        web::scope("")
                            .wrap(JwtMiddleware)
                            .configure(configure_protected_user_routes)
                            .configure(configure_customer_routes)
                            .configure(configure_organisation_routes)
                            .configure(configure_invoice_routes)
                            .configure(configure_expense_routes)
                            .configure(configure_purchase_order_routes)
                            .configure(configure_cost_center_routes)
                            .configure(configure_incoming_invoice_routes),
                    )
            )
    })
    .bind((host, port))?
    .run()
    .await
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "finance-suite-professional-backend"
    }))
}
