use std::sync::Arc;
use mongodb::bson::{oid::ObjectId, Document, doc};
use crate::{
    models::{record::Record, transaction::Transaction},
    repository::{
        record_repository::RecordRepository,
        transaction_repository::TransactionRepository,
        user_repository::UserRepository,
    },
};

#[derive(Clone)]
pub struct TransactionService {
    repo:        Arc<TransactionRepository>,
    record_repo: Arc<RecordRepository>,
    user_repo:   Arc<UserRepository>,
}

impl TransactionService {
    pub fn new(repo: TransactionRepository, record_repo: RecordRepository, user_repo: UserRepository) -> Self {
        Self {
            repo:        Arc::new(repo),
            record_repo: Arc::new(record_repo),
            user_repo:   Arc::new(user_repo),
        }
    }

    pub async fn get_user_permissions(&self, user_id: &str) -> anyhow::Result<Option<crate::models::users::User>> {
        Ok(self.user_repo.get_user_by_id(user_id).await?)
    }

    /// Find existing record by title or create a new one, then tag all transactions with its id.
    pub async fn save_many(&self, mut items: Vec<Transaction>, org_id: &ObjectId, title: &str) -> anyhow::Result<Vec<Transaction>> {
        // Find or create the Record document
        let record = match self.record_repo.find_by_title(org_id, title).await? {
            Some(r) => r,
            None => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as i64;
                self.record_repo.insert(Record {
                    id: None,
                    title: title.to_string(),
                    created_at: now,
                    status: "notreviewed".to_string(),
                    notes: String::new(),
                    organisation_id: Some(*org_id),
                }).await?
            }
        };
        let record_id = record.id.ok_or_else(|| anyhow::anyhow!("Record insert failed"))?;

        for t in &mut items {
            t.organisation_id = Some(*org_id);
            t.record_id = Some(record_id);
            t.title = title.to_string();
        }
        Ok(self.repo.insert_many(items).await?)
    }

    /// Returns records with aggregated transaction stats, joined with Record metadata.
    pub async fn list_records(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Document>> {
        let records = self.record_repo.get_by_org(org_id).await?;
        let stats   = self.repo.get_records_with_stats(org_id).await?;

        // Build a map: record_id → stats doc
        use std::collections::HashMap;
        let stats_map: HashMap<ObjectId, &Document> = stats.iter().filter_map(|d| {
            d.get_object_id("_id").ok().map(|id| (id, d))
        }).collect();

        let mut out = Vec::new();
        for rec in &records {
            let rid = match rec.id { Some(id) => id, None => continue };
            let s = stats_map.get(&rid);
            let mut d = doc! {
                "id":         rid.to_hex(),
                "title":      &rec.title,
                "created_at": rec.created_at,
                "status":     &rec.status,
                "notes":      &rec.notes,
                "count":        s.and_then(|d| d.get_i32("count").ok()).unwrap_or(0),
                "total_debit":  s.and_then(|d| d.get_f64("total_debit").ok()).unwrap_or(0.0),
                "total_credit": s.and_then(|d| d.get_f64("total_credit").ok()).unwrap_or(0.0),
                "from_date":    s.and_then(|d| d.get_str("from_date").ok()).unwrap_or(""),
                "to_date":      s.and_then(|d| d.get_str("to_date").ok()).unwrap_or(""),
            };
            out.push(d);
        }
        // Sort newest first
        out.sort_by(|a, b| {
            let ta = a.get_i64("created_at").unwrap_or(0);
            let tb = b.get_i64("created_at").unwrap_or(0);
            tb.cmp(&ta)
        });
        Ok(out)
    }

    pub async fn list_by_record_id(&self, org_id: &ObjectId, record_id: &ObjectId) -> anyhow::Result<Vec<Transaction>> {
        Ok(self.repo.get_by_record_id(org_id, record_id).await?)
    }

    pub async fn list(&self, org_id: &ObjectId) -> anyhow::Result<Vec<Transaction>> {
        Ok(self.repo.get_by_org(org_id).await?)
    }

    pub async fn get_by_id(&self, id: &str) -> anyhow::Result<Option<Transaction>> {
        Ok(self.repo.get_by_id(id).await?)
    }

    pub async fn get_record_by_id(&self, id: &ObjectId) -> anyhow::Result<Option<Record>> {
        Ok(self.record_repo.get_by_id(id).await?)
    }

    pub async fn update(&self, id: &str, t: Transaction) -> anyhow::Result<Option<Transaction>> {
        Ok(self.repo.update(id, t).await?)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<bool> {
        Ok(self.repo.delete(id).await?)
    }

    /// Delete all transactions for a record, then delete the record itself.
    pub async fn update_record_status(&self, org_id: &ObjectId, record_id: &ObjectId, status: &str) -> anyhow::Result<bool> {
        let record = self.record_repo.get_by_id(record_id).await?
            .ok_or_else(|| anyhow::anyhow!("Record not found"))?;
        if record.organisation_id != Some(*org_id) {
            anyhow::bail!("Access denied");
        }
        Ok(self.record_repo.update_status(record_id, status).await?)
    }

    pub async fn update_record_notes(&self, org_id: &ObjectId, record_id: &ObjectId, notes: &str) -> anyhow::Result<bool> {
        let record = self.record_repo.get_by_id(record_id).await?
            .ok_or_else(|| anyhow::anyhow!("Record not found"))?;
        if record.organisation_id != Some(*org_id) {
            anyhow::bail!("Access denied");
        }
        Ok(self.record_repo.update_notes(record_id, notes).await?)
    }

    pub async fn delete_record(&self, org_id: &ObjectId, record_id: &ObjectId) -> anyhow::Result<u64> {
        let deleted = self.repo.delete_by_record_id(org_id, record_id).await?;
        self.record_repo.delete(record_id).await?;
        Ok(deleted)
    }
}
