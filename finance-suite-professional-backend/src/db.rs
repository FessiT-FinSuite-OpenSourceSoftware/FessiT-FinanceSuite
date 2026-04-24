use mongodb::{Client, Collection, Database, options::ClientOptions};
use std::env;

use crate::models::{
    Category, Challan, CostCenter, Customer, Expense, GeneralExpense, IncomingInvoice, Invoice,
    Organisation, PartyCounter, Product, PurchaseOrder, Salary, User, Account,
};

#[derive(Clone)]
pub struct MongoDbClient {
    pub client: Client,
    pub database: Database,
}

impl MongoDbClient {
    pub async fn new() -> Result<Self, mongodb::error::Error> {
        let mongodb_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
        let database_name = env::var("DATABASE_NAME").expect("DATABASE_NAME must be set");

        let mut client_options = ClientOptions::parse(&mongodb_uri).await?;
        client_options.retry_writes = Some(false);

        let client = Client::with_options(client_options)?;

        client
            .database("admin")
            .run_command(mongodb::bson::doc! {"ping": 1}, None)
            .await?;

        log::info!("Successfully connected to MongoDB");

        let database = client.database(&database_name);

        Ok(Self { client, database })
    }

    pub fn client(&self) -> Client {
        self.client.clone()
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

    pub fn get_product_collection(&self) -> Collection<Product> {
        self.database.collection::<Product>("products")
    }

    pub fn get_cost_center_collection(&self) -> Collection<CostCenter> {
        self.database.collection::<CostCenter>("cost_centers")
    }

    pub fn get_salary_collection(&self) -> Collection<Salary> {
        self.database.collection::<Salary>("salaries")
    }

    pub fn get_general_expense_collection(&self) -> Collection<GeneralExpense> {
        self.database.collection::<GeneralExpense>("general_expenses")
    }

    pub fn get_challan_collection(&self) -> Collection<Challan> {
        self.database.collection::<Challan>("challans")
    }

    pub fn get_category_collection(&self) -> Collection<Category> {
        self.database.collection::<Category>("categories")
    }

    pub fn get_estimate_collection(&self) -> Collection<crate::models::estimate::Estimate> {
        self.database.collection("estimates")
    }

    pub fn get_ledger_collection(&self) -> Collection<crate::models::ledger::LedgerEntry> {
        self.database.collection("ledger")
    }

    pub fn get_ledger_counter_collection(&self) -> Collection<PartyCounter> {
        self.database.collection("ledger_counters")
    }

    pub fn get_account_collection(&self) -> Collection<Account> {
        self.database.collection("accounts")
    }
}
