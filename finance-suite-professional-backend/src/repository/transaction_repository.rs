use std::sync::Arc;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;
use crate::models::transaction::Transaction;

#[derive(Clone)]
pub struct TransactionRepository {
    collection: Arc<Collection<Transaction>>,
    raw: Arc<Collection<Document>>,
}

fn from_doc(raw: Document) -> Option<Transaction> {
    let oid = raw.get_object_id("_id").ok();
    let mut t: Transaction = from_document(raw).ok()?;
    t.id = oid;
    Some(t)
}

impl TransactionRepository {
    pub fn new(col: Collection<Transaction>) -> Self {
        let raw = col.clone_with_type::<Document>();
        Self { collection: Arc::new(col), raw: Arc::new(raw) }
    }

    pub async fn insert_many(&self, items: Vec<Transaction>) -> Result<Vec<Transaction>, MongoError> {
        if items.is_empty() { return Ok(vec![]); }
        let result = self.collection.insert_many(&items, None).await?;
        let mut out = items;
        for (i, id) in result.inserted_ids.values().enumerate() {
            if let Some(oid) = id.as_object_id() {
                if let Some(t) = out.get_mut(i) { t.id = Some(oid); }
            }
        }
        Ok(out)
    }

    pub async fn get_records_with_stats(&self, org_id: &ObjectId) -> Result<Vec<Document>, MongoError> {
        // Groups transactions by recordId, computes totals and derives status:
        // all reconciled → "reconciled", any reviewed → "reviewed", else → "pending"
        let pipeline = vec![
            doc! { "$match": { "organisationId": org_id } },
            doc! { "$group": {
                "_id": "$recordId",
                "count":        { "$sum": 1 },
                "total_debit":  { "$sum": { "$ifNull": ["$debit",  0.0] } },
                "total_credit": { "$sum": { "$ifNull": ["$credit", 0.0] } },
                "from_date":    { "$min": "$date" },
                "to_date":      { "$max": "$date" },
                "reconciled_count": { "$sum": { "$cond": [{ "$eq": ["$status", "reconciled"] }, 1, 0] } },
                "reviewed_count":   { "$sum": { "$cond": [{ "$eq": ["$status", "reviewed"]   }, 1, 0] } },
            }},
            doc! { "$addFields": {
                "derived_status": { "$switch": {
                    "branches": [
                        { "case": { "$eq": ["$reconciled_count", "$count"] }, "then": "reconciled" },
                        { "case": { "$gt": ["$reviewed_count", 0] },          "then": "reviewed"   },
                    ],
                    "default": "pending"
                }}
            }},
            doc! { "$sort": { "_id": -1 } },
        ];
        let mut cursor = self.raw.aggregate(pipeline, None).await?;
        let mut out = Vec::new();
        while let Some(doc) = cursor.try_next().await? { out.push(doc); }
        Ok(out)
    }

    pub async fn get_by_record_id(&self, org_id: &ObjectId, record_id: &ObjectId) -> Result<Vec<Transaction>, MongoError> {
        let mut cursor = self.raw.find(
            doc! { "organisationId": org_id, "recordId": record_id }, None,
        ).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await? {
            if let Some(t) = from_doc(raw) { list.push(t); }
        }
        Ok(list)
    }

    pub async fn delete_by_record_id(&self, org_id: &ObjectId, record_id: &ObjectId) -> Result<u64, MongoError> {
        let res = self.collection.delete_many(
            doc! { "organisationId": org_id, "recordId": record_id }, None,
        ).await?;
        Ok(res.deleted_count)
    }

    pub async fn get_by_org(&self, org_id: &ObjectId) -> Result<Vec<Transaction>, MongoError> {
        let mut cursor = self.raw.find(doc! { "organisationId": org_id }, None).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await? {
            if let Some(t) = from_doc(raw) { list.push(t); }
        }
        Ok(list)
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Transaction>, MongoError> {
        let oid = ObjectId::parse_str(id).ok().ok_or_else(|| {
            MongoError::from(std::io::Error::new(std::io::ErrorKind::InvalidInput, "invalid id"))
        })?;
        let raw = self.raw.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(from_doc))
    }

    pub async fn update(&self, id: &str, mut t: Transaction) -> Result<Option<Transaction>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        t.id = Some(oid);
        let res = self.collection.replace_one(doc! { "_id": oid }, &t, None).await?;
        if res.matched_count == 0 { return Ok(None); }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(false) };
        let res = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(res.deleted_count > 0)
    }

}
