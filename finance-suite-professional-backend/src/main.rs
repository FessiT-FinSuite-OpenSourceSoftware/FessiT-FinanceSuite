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
    configure_cost_center_routes, configure_salary_routes, configure_general_expense_routes,
    configure_challan_routes, configure_category_routes, configure_product_routes,
};
use repository::{
    CustomerRepository, ExpenseRepository, InvoiceRepository, IncomingInvoiceRepository,
    OrganisationRepository, UserRepository, PurchaseOrderRepository, CostCenterRepository,
    SalaryRepository, GeneralExpenseRepository, ChallanRepository, CategoryRepository, ProductRepository,
};
use services::{CustomerService, ExpenseService, InvoiceService, IncomingInvoiceService, OrganisationService, UserService, PurchaseOrderService, CostCenterService, SalaryService, GeneralExpenseService, ChallanService, CategoryService, ProductService};
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
    // Invoices - repository only, service created after all repos
    let invoice_collection = db_client.get_invoice_collection();
    let invoice_repository = InvoiceRepository::new(invoice_collection);
    let expense_collection = db_client.get_expense_collection();
    let expense_repository = ExpenseRepository::new(expense_collection);
    let expense_service = ExpenseService::new(expense_repository.clone(), user_repository.clone());

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

    // 🔹 Salaries
    let salary_collection = db_client.get_salary_collection();
    let salary_repository = SalaryRepository::new(salary_collection);
    let salary_service = SalaryService::new(salary_repository, user_repository.clone());

    // 🔹 General Expenses
    let general_expense_collection = db_client.get_general_expense_collection();
    let general_expense_repository = GeneralExpenseRepository::new(general_expense_collection);
    let general_expense_service = GeneralExpenseService::new(general_expense_repository.clone(), user_repository.clone());

    let invoice_service = InvoiceService::new(invoice_repository, organisation_repository.clone(), user_repository.clone(), expense_repository, general_expense_repository);

    // Challans
    let challan_collection = db_client.get_challan_collection();
    let challan_repository = ChallanRepository::new(challan_collection);
    let challan_service = ChallanService::new(challan_repository, user_repository.clone());
    let category_collection = db_client.get_category_collection();
    let category_repository = CategoryRepository::new(category_collection);
    let category_service = CategoryService::new(category_repository, user_repository.clone());
    log::info!("Starting server at http://{}:{}", host, port);
    let product_collection = db_client.get_product_collection();
    let product_repository = ProductRepository::new(product_collection);
    let product_service = ProductService::new(product_repository, user_repository.clone());
    product_service.ensure_indexes().await.expect("❌ Failed to create product indexes");

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
            .app_data(web::Data::new(salary_service.clone()))
            .app_data(web::Data::new(general_expense_service.clone()))
            .app_data(web::Data::new(challan_service.clone()))
            .app_data(web::Data::new(category_service.clone()))
            // all APIs under /api/v1
            .app_data(web::Data::new(product_service.clone()))
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
                            .configure(configure_incoming_invoice_routes)
                            .configure(configure_salary_routes)
                            .configure(configure_general_expense_routes)
                            .configure(configure_challan_routes)
                            .configure(configure_category_routes)
                            .configure(configure_product_routes)
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
