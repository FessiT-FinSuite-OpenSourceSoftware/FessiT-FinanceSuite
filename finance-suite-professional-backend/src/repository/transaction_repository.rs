use std::sync::Arc;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    Collection,
};
use futures::stream::TryStreamExt;
use serde::Deserialize;
use crate::models::transaction::Transaction;

#[derive(Debug, Deserialize, Default)]
pub struct TransactionFilterParams {
    pub txn_type:     Option<String>,
    pub txn_category: Option<String>,
    pub date_from:    Option<String>,
    pub date_to:      Option<String>,
    pub search:       Option<String>,
    pub page:         Option<u32>,
    pub page_size:    Option<u32>,
}

#[derive(Clone)]
pub struct TransactionRepository {
    collection: Arc<Collection<Transaction>>,
    raw: Arc<Collection<Document>>,
}

fn detect_mongo_date_format(sample: &str) -> &'static str {
    // "01-Jul-2026"  dd-Mon-yyyy
    if sample.len() == 11 && sample.chars().nth(2) == Some('-') && sample.chars().nth(6) == Some('-') {
        return "%d-%b-%Y";
    }
    // "2026-07-01"  yyyy-mm-dd
    if sample.len() == 10 && sample.chars().nth(4) == Some('-') && sample.chars().nth(7) == Some('-') {
        return "%Y-%m-%d";
    }
    // "01/07/2026"  dd/mm/yyyy
    if sample.len() == 10 && sample.chars().nth(2) == Some('/') && sample.chars().nth(5) == Some('/') {
        return "%d/%m/%Y";
    }
    // "01.07.2026"  dd.mm.yyyy
    if sample.len() == 10 && sample.chars().nth(2) == Some('.') && sample.chars().nth(5) == Some('.') {
        return "%d.%m.%Y";
    }
    // "2026/07/01"  yyyy/mm/dd
    if sample.len() == 10 && sample.chars().nth(4) == Some('/') && sample.chars().nth(7) == Some('/') {
        return "%Y/%m/%d";
    }
    "%Y-%m-%d"
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

    pub async fn get_by_record_id_filtered(
        &self,
        org_id: &ObjectId,
        record_id: &ObjectId,
        params: &TransactionFilterParams,
    ) -> Result<(Vec<Transaction>, u64, Document), MongoError> {
        let mut filter = doc! { "organisationId": org_id, "recordId": record_id };

        // Type filter — debit/credit fields are absent (not null) when not applicable
        if let Some(ref t) = params.txn_type {
            if t == "Credit" {
                filter.insert("credit", doc! { "$exists": true, "$ne": mongodb::bson::Bson::Null });
            } else if t == "Debit" {
                filter.insert("debit", doc! { "$exists": true, "$ne": mongodb::bson::Bson::Null });
            }
        }

        // Transaction category filter
        if let Some(ref cat) = params.txn_category {
            filter.insert("transaction_category", cat.as_str());
        }

        // Date range filter — sniff format from a sample doc, then apply adaptively
        if params.date_from.is_some() || params.date_to.is_some() {
            let sample_opts = mongodb::options::FindOneOptions::builder()
                .projection(doc! { "date": 1 })
                .build();
            let base_filter = doc! { "organisationId": org_id, "recordId": record_id };
            let date_fmt = if let Ok(Some(sample_doc)) = self.raw.find_one(base_filter, sample_opts).await {
                detect_mongo_date_format(sample_doc.get_str("date").unwrap_or(""))
            } else {
                "%Y-%m-%d"
            };

            let mut and_conditions = vec![];
            if let Some(ref from) = params.date_from {
                let from_iso = format!("{}T00:00:00Z", from);
                and_conditions.push(mongodb::bson::Bson::Document(doc! {
                    "$expr": {
                        "$gte": [
                            { "$dateFromString": { "dateString": "$date", "format": date_fmt } },
                            { "$dateFromString": { "dateString": from_iso.as_str() } }
                        ]
                    }
                }));
            }
            if let Some(ref to) = params.date_to {
                let to_iso = format!("{}T00:00:00Z", to);
                and_conditions.push(mongodb::bson::Bson::Document(doc! {
                    "$expr": {
                        "$lte": [
                            { "$dateFromString": { "dateString": "$date", "format": date_fmt } },
                            { "$dateFromString": { "dateString": to_iso.as_str() } }
                        ]
                    }
                }));
            }
            if !and_conditions.is_empty() {
                filter.insert("$and", mongodb::bson::Bson::Array(and_conditions));
            }
        }

        // Search filter (narration or reference)
        if let Some(ref q) = params.search {
            if !q.is_empty() {
                filter.insert("$or", mongodb::bson::Bson::Array(vec![
                    mongodb::bson::Bson::Document(doc! { "narration":    { "$regex": q.as_str(), "$options": "i" } }),
                    mongodb::bson::Bson::Document(doc! { "description":  { "$regex": q.as_str(), "$options": "i" } }),
                    mongodb::bson::Bson::Document(doc! { "reference":    { "$regex": q.as_str(), "$options": "i" } }),
                ]));
            }
        }

        let total = self.raw.count_documents(filter.clone(), None).await?;

        // Aggregate totals across ALL filtered docs (not just current page)
        let agg_pipeline = vec![
            doc! { "$match": filter.clone() },
            doc! { "$group": {
                "_id": null,
                "total_credits": { "$sum": { "$ifNull": ["$credit", 0.0] } },
                "total_debits":  { "$sum": { "$ifNull": ["$debit",  0.0] } },
                "debt_taken":  { "$sum": { "$cond": [{ "$eq": ["$transaction_category", "Debt Taken"]  }, { "$ifNull": ["$debit",  { "$ifNull": ["$credit", 0.0] }] }, 0.0] } },
                "debt_repaid": { "$sum": { "$cond": [{ "$eq": ["$transaction_category", "Debt Repaid"] }, { "$ifNull": ["$debit",  { "$ifNull": ["$credit", 0.0] }] }, 0.0] } },
            }},
        ];
        let mut agg_cursor = self.raw.aggregate(agg_pipeline, None).await?;
        let agg_doc = agg_cursor.try_next().await?.unwrap_or_default();
        let totals = doc! {
            "total_credits": agg_doc.get_f64("total_credits").unwrap_or(0.0),
            "total_debits":  agg_doc.get_f64("total_debits").unwrap_or(0.0),
            "debt_taken":    agg_doc.get_f64("debt_taken").unwrap_or(0.0),
            "debt_repaid":   agg_doc.get_f64("debt_repaid").unwrap_or(0.0),
        };

        let skip  = ((params.page.unwrap_or(1).max(1) - 1) * params.page_size.unwrap_or(10)) as u64;
        let limit = params.page_size.unwrap_or(10) as i64;

        let options = mongodb::options::FindOptions::builder()
            .sort(doc! { "date": 1 })
            .skip(skip)
            .limit(limit)
            .build();

        let mut cursor = self.raw.find(filter, options).await?;
        let mut list = Vec::new();
        while let Some(raw) = cursor.try_next().await? {
            if let Some(t) = from_doc(raw) { list.push(t); }
        }
        Ok((list, total, totals))
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

    pub async fn update(&self, id: &str, t: Transaction) -> Result<Option<Transaction>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        let set_doc = doc! { "$set": {
            "date":                 &t.date,
            "description":          &t.description,
            "narration":            &t.narration,
            "reference":            &t.reference,
            "category":             &t.category,
            "transaction_category": &t.transaction_category,
            "type":                 &t.r#type,
            "amount":               t.amount,
            "balance":              t.balance,
            "debit":                t.debit,
            "credit":               t.credit,
            "status":               &t.status,
            "notes":                &t.notes,
        }};
        let res = self.raw.update_one(doc! { "_id": oid }, set_doc, None).await?;
        if res.matched_count == 0 { return Ok(None); }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(false) };
        let res = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(res.deleted_count > 0)
    }

}
