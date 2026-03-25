use mongodb::{Client, Collection, Database};
use std::env;

use crate::models::{Customer, Expense, Invoice, IncomingInvoice, Organisation, User, PurchaseOrder, CostCenter};

#[derive(Clone)]
pub struct MongoDbClient {
    pub database: Database,
}

impl MongoDbClient {
    pub async fn new() -> Result<Self, mongodb::error::Error> {
        let mongodb_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
        let database_name = env::var("DATABASE_NAME").expect("DATABASE_NAME must be set");

        let client = Client::with_uri_str(&mongodb_uri).await?;

        client
            .database("admin")
            .run_command(mongodb::bson::doc! {"ping": 1}, None)
            .await?;

        log::info!("✅ Successfully connected to MongoDB");

        let database = client.database(&database_name);

        Ok(Self { database })
    }

    pub fn get_customers_collection(&self) -> Collection<Customer> {
        self.database.collection::<Customer>("customers")
    }

    pub fn get_organisation_collection(&self) -> Collection<Organisation> {
        self.database.collection::<Organisation>("organisations")
    }

    pub fn get_invoice_collection(&self) -> Collection<Invoice> {
        self.database.collection::<Invoice>("invoices")
    }

    pub fn get_incoming_invoice_collection(&self) -> Collection<IncomingInvoice> {
        self.database.collection::<IncomingInvoice>("incoming_invoices")
    }

    pub fn get_expense_collection(&self) -> Collection<Expense> {
        self.database.collection::<Expense>("expenses")
    }

    pub fn get_user_collection(&self) -> Collection<User> {
        self.database.collection::<User>("users")
    }

    pub fn get_purchase_order_collection(&self) -> Collection<PurchaseOrder> {
        self.database.collection::<PurchaseOrder>("purchase_orders")
    }

    pub fn get_cost_center_collection(&self) -> Collection<CostCenter> {
        self.database.collection::<CostCenter>("cost_centers")
    }
}
