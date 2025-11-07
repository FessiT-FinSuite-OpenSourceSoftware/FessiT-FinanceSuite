use mongodb::{Client, Collection, Database};
use std::env;

use crate::models::Customer;

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
}
