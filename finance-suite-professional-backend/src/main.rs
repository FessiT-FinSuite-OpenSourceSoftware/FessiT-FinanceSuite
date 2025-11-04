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
use handlers::configure_routes;
use repository::CustomerRepository;
use services::CustomerService;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();
    env_logger::init();

    // Get configuration from environment
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("Invalid SERVER_PORT");
    let cors_origin =
        env::var("CORS_ALLOWED_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string());

    // Initialize MongoDB connection
    let db_client = MongoDbClient::new()
        .await
        .expect("Failed to connect to MongoDB");

    log::info!("Connected to MongoDB successfully");

    // Create repository and service
    let customer_collection = db_client.get_customers_collection();
    let customer_repository = CustomerRepository::new(customer_collection);
    let customer_service = CustomerService::new(customer_repository);

    log::info!("Starting server at http://{}:{}", host, port);

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&cors_origin)
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(web::Data::new(customer_service.clone()))
            .route("/health", web::get().to(health_check))
            .configure(configure_routes)
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