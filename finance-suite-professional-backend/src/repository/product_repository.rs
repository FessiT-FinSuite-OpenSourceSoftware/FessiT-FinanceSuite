use std::sync::Arc;

use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    options::IndexOptions,
    Collection, IndexModel,
};
use futures::stream::TryStreamExt;

use crate::models::product::Product;

#[derive(Clone)]
pub struct ProductRepository {
    collection: Arc<Collection<Product>>,
    raw_collection: Arc<Collection<Document>>,
}

fn doc_to_product(raw: Document) -> Option<Product> {
    let oid = raw.get_object_id("_id").ok();
    let mut product: Product = from_document(raw).ok()?;
    product.id = oid;
    Some(product)
}

impl ProductRepository {
    pub fn new(collection: Collection<Product>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    /// Creates a compound unique index on (name, organisationId) scoped per org.
    /// Called once at startup.
    pub async fn ensure_indexes(&self) -> Result<(), MongoError> {
        let index = IndexModel::builder()
            .keys(doc! { "name": 1, "organisationId": 1 })
            .options(
                IndexOptions::builder()
                    .unique(true)
                    .name("unique_name_per_org".to_string())
                    .build(),
            )
            .build();
        self.collection.create_index(index, None).await?;
        Ok(())
    }

    /// Returns true if a product with the same name already exists in the org,
    /// optionally excluding a specific product id (for update checks).
    pub async fn name_exists_in_org(
        &self,
        name: &str,
        org_id: &ObjectId,
        exclude_id: Option<&ObjectId>,
    ) -> Result<bool, MongoError> {
        let mut filter = doc! {
            "name": { "$regex": format!("^{}$", regex::escape(name)), "$options": "i" },
            "organisationId": org_id,
        };
        if let Some(eid) = exclude_id {
            filter.insert("_id", doc! { "$ne": eid });
        }
        Ok(self.raw_collection.count_documents(filter, None).await? > 0)
    }

    async fn fetch_many(&self, filter: impl Into<Option<Document>>) -> Result<Vec<Product>, MongoError> {
        let mut cursor = self.raw_collection.find(filter, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(p) = doc_to_product(raw) {
                list.push(p);
            }
        }
        Ok(list)
    }

    pub async fn create(&self, mut product: Product) -> Result<Product, MongoError> {
        let result = self.collection.insert_one(&product, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            product.id = Some(id);
        }
        Ok(product)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Product>, MongoError> {
        self.fetch_many(doc! { "organisationId": org_id }).await
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Product>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_product))
    }

    pub async fn update(&self, id: &str, mut product: Product) -> Result<Option<Product>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        product.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, product, None).await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(false),
        };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }

    pub async fn add_stock(&self, id: &str, quantity: f64) -> Result<Option<Product>, MongoError> {
        let oid = match ObjectId::parse_str(id) {
            Ok(o) => o,
            Err(_) => return Ok(None),
        };
        let result = self.raw_collection
            .update_one(doc! { "_id": oid }, doc! { "$inc": { "stocks": quantity } }, None)
            .await?;
        if result.matched_count == 0 {
            return Ok(None);
        }
        self.get_by_id(id).await
    }
}
