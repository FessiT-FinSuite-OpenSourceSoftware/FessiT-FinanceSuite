use std::sync::Arc;

use futures::stream::TryStreamExt;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, DateTime, Document},
    ClientSession,
    error::{Error as MongoError, ErrorKind, WriteFailure},
    options::{FindOneAndUpdateOptions, FindOptions, IndexOptions, ReturnDocument, UpdateOptions},
    Client, Collection, IndexModel,
};

use crate::models::{
    ledger::LedgerEntry,
    ledgerCounter::PartyCounter,
};

#[derive(Clone)]
pub struct LedgerRepository {
    client: Arc<Client>,
    collection: Arc<Collection<LedgerEntry>>,
    raw_collection: Arc<Collection<Document>>,
    counter_collection: Arc<Collection<PartyCounter>>,
    raw_counter_collection: Arc<Collection<Document>>,
}

fn doc_to_entry(raw: Document) -> Option<LedgerEntry> {
    let oid = raw.get_object_id("_id").ok();
    let mut entry: LedgerEntry = from_document(raw).ok()?;
    entry.id = oid;
    Some(entry)
}

fn doc_to_counter(raw: Document) -> Option<PartyCounter> {
    from_document(raw).ok()
}

pub struct LedgerQuery {
    pub party_id: Option<ObjectId>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

pub struct LedgerResult {
    pub data: Vec<LedgerEntry>,
    pub total: u64,
    pub total_amount: f64,
}

impl LedgerRepository {
    pub fn new(
        client: Client,
        collection: Collection<LedgerEntry>,
        counter_collection: Collection<PartyCounter>,
    ) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        let raw_counter_collection = counter_collection.clone_with_type::<Document>();
        Self {
            client: Arc::new(client),
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
            counter_collection: Arc::new(counter_collection),
            raw_counter_collection: Arc::new(raw_counter_collection),
        }
    }

    /// Ensures the ledger has stable uniqueness for retries and ordering.
    pub async fn ensure_indexes(&self) -> Result<(), MongoError> {
        let unique_sequence_index = IndexModel::builder()
            .keys(doc! { "organisationId": 1, "partyId": 1, "sequence": 1 })
            .options(
                IndexOptions::builder()
                    .unique(true)
                    .name("unique_party_sequence".to_string())
                    .build(),
            )
            .build();

        let unique_idempotency_index = IndexModel::builder()
            .keys(doc! { "idempotencyKey": 1 })
            .options(
                IndexOptions::builder()
                    .unique(true)
                    .sparse(true)
                    .name("unique_ledger_idempotency_key".to_string())
                    .build(),
            )
            .build();

        self.collection.create_indexes(vec![unique_sequence_index, unique_idempotency_index], None).await?;
        Ok(())
    }

    async fn get_by_idempotency_key(
        &self,
        idempotency_key: &str,
    ) -> Result<Option<LedgerEntry>, MongoError> {
        let raw = self
            .raw_collection
            .find_one(doc! { "idempotencyKey": idempotency_key }, None)
            .await?;
        Ok(raw.and_then(doc_to_entry))
    }

    fn is_duplicate_key_error(err: &MongoError) -> bool {
        match err.kind.as_ref() {
            ErrorKind::Write(WriteFailure::WriteError(write_error)) => write_error.code == 11000,
            ErrorKind::BulkWrite(bulk) => bulk
                .write_errors
                .as_ref()
                .map(|errors| errors.iter().any(|error| error.code == 11000))
                .unwrap_or(false),
            ErrorKind::Command(command_error) => command_error.code == 11000,
            _ => false,
        }
    }

    fn is_transaction_not_supported(err: &MongoError) -> bool {
        matches!(err.kind.as_ref(), ErrorKind::Transaction { .. })
            || err.to_string().to_lowercase().contains("transactions are not supported")
            || err.to_string().to_lowercase().contains("transaction numbers are only allowed")
            || err.to_string().to_lowercase().contains("replica set")
            || err.to_string().to_lowercase().contains("retrywrites")
            || matches!(
                err.kind.as_ref(),
                ErrorKind::Command(cmd) if cmd.code == 20
            )
    }

    fn parse_date(input: &Option<String>) -> Option<DateTime> {
        input
            .as_ref()
            .and_then(|value| DateTime::parse_rfc3339_str(value).ok())
    }

    fn parse_date_end_of_day(input: &Option<String>) -> Option<DateTime> {
        input.as_ref().and_then(|value| {
            // If it's a full ISO datetime, use as-is
            if let Ok(dt) = DateTime::parse_rfc3339_str(value) {
                // If time is midnight (00:00:00), push to end of day
                let millis = dt.timestamp_millis();
                let day_start = millis - (millis % 86_400_000);
                if millis == day_start {
                    return DateTime::from_millis(day_start + 86_399_999).into();
                }
                return Some(dt);
            }
            None
        })
    }

    fn build_filter(
        org_id: &ObjectId,
        party_id: Option<&ObjectId>,
        from: &Option<String>,
        to: &Option<String>,
    ) -> Document {
        let mut filter = doc! { "organisationId": org_id };

        if let Some(party_id) = party_id {
            filter.insert("partyId", party_id);
        }

        if from.is_some() || to.is_some() {
            let mut date_filter = Document::new();
            if let Some(from_dt) = Self::parse_date(from) {
                date_filter.insert("$gte", from_dt);
            }
            if let Some(to_dt) = Self::parse_date_end_of_day(to) {
                date_filter.insert("$lte", to_dt);
            }
            if !date_filter.is_empty() {
                filter.insert("date", date_filter);
            }
        }

        filter
    }

    async fn record_entry_in_transaction(
        &self,
        mut session: ClientSession,
        mut entry: LedgerEntry,
    ) -> Result<LedgerEntry, MongoError> {
        session.start_transaction(None).await?;
        let now = DateTime::now();
        let delta = entry.credit - entry.debit;
        let org_id = entry.organisation_id;

        // Update party counter (for per-customer tracking)
        let party_counter_filter = doc! { "_id": &entry.party_id };
        let party_counter_update = doc! {
            "$setOnInsert": { "_id": &entry.party_id, "sequence": 0i64, "balance": 0i64 },
            "$inc": { "sequence": 1i64 },
            "$set": { "updatedAt": now }
        };
        let party_counter_options = FindOneAndUpdateOptions::builder()
            .upsert(true)
            .return_document(ReturnDocument::After)
            .build();
        let party_counter = self
            .counter_collection
            .find_one_and_update_with_session(party_counter_filter, party_counter_update, party_counter_options, &mut session)
            .await?
            .ok_or_else(|| MongoError::custom("Failed to allocate ledger sequence"))?;

        // Update org counter (for org-level balance)
        let org_counter_filter = doc! { "_id": &org_id };
        let org_counter_update = doc! {
            "$setOnInsert": { "_id": &org_id, "sequence": 0i64, "balance": 0i64 },
            "$inc": { "balance": delta },
            "$set": { "updatedAt": now }
        };
        let org_counter_options = FindOneAndUpdateOptions::builder()
            .upsert(true)
            .return_document(ReturnDocument::After)
            .build();
        let org_counter = self
            .counter_collection
            .find_one_and_update_with_session(org_counter_filter, org_counter_update, org_counter_options, &mut session)
            .await?
            .ok_or_else(|| MongoError::custom("Failed to update org balance"))?;

        entry.sequence = party_counter.sequence;
        entry.balance = org_counter.balance; // balance reflects org total
        entry.created_at = now;

        let inserted = self
            .collection
            .insert_one_with_session(&entry, None, &mut session)
            .await;

        match inserted {
            Ok(result) => {
                if let Some(id) = result.inserted_id.as_object_id() {
                    entry.id = Some(id);
                }
                session.commit_transaction().await?;
                Ok(entry)
            }
            Err(err) => {
                let _ = session.abort_transaction().await;

                if Self::is_duplicate_key_error(&err) {
                    if let Some(key) = entry.idempotency_key.as_deref() {
                        return self
                            .get_by_idempotency_key(key)
                            .await?
                            .ok_or_else(|| MongoError::custom("Ledger entry conflicted but could not be found"));
                    }
                }

                Err(err)
            }
        }
    }

    async fn record_entry_without_transaction(
        &self,
        mut entry: LedgerEntry,
    ) -> Result<LedgerEntry, MongoError> {
        let now = DateTime::now();
        let delta = entry.credit - entry.debit;
        let org_id = entry.organisation_id;
        let upsert_options = UpdateOptions::builder().upsert(true).build();
        let after_options = FindOneAndUpdateOptions::builder()
            .upsert(false)
            .return_document(ReturnDocument::After)
            .build();

        // Init + increment party counter (sequence only)
        self.counter_collection
            .update_one(
                doc! { "_id": &entry.party_id },
                doc! { "$setOnInsert": { "_id": &entry.party_id, "sequence": 0i64, "balance": 0i64 } },
                upsert_options.clone(),
            )
            .await?;
        let party_counter = self
            .counter_collection
            .find_one_and_update(
                doc! { "_id": &entry.party_id },
                doc! { "$inc": { "sequence": 1i64 }, "$set": { "updatedAt": now } },
                after_options.clone(),
            )
            .await?
            .ok_or_else(|| MongoError::custom("Failed to allocate ledger sequence"))?;

        // Init + increment org counter (balance only)
        self.counter_collection
            .update_one(
                doc! { "_id": &org_id },
                doc! { "$setOnInsert": { "_id": &org_id, "sequence": 0i64, "balance": 0i64 } },
                upsert_options,
            )
            .await?;
        let org_counter = self
            .counter_collection
            .find_one_and_update(
                doc! { "_id": &org_id },
                doc! { "$inc": { "balance": delta }, "$set": { "updatedAt": now } },
                after_options,
            )
            .await?
            .ok_or_else(|| MongoError::custom("Failed to update org balance"))?;

        entry.sequence = party_counter.sequence;
        entry.balance = org_counter.balance; // balance reflects org total
        entry.created_at = now;

        let inserted = self.collection.insert_one(&entry, None).await;
        match inserted {
            Ok(result) => {
                if let Some(id) = result.inserted_id.as_object_id() {
                    entry.id = Some(id);
                }
                Ok(entry)
            }
            Err(err) => {
                if Self::is_duplicate_key_error(&err) {
                    if let Some(key) = entry.idempotency_key.as_deref() {
                        return self
                            .get_by_idempotency_key(key)
                            .await?
                            .ok_or_else(|| MongoError::custom("Ledger entry conflicted but could not be found"));
                    }
                }
                Err(err)
            }
        }
    }

    pub async fn record_entry(&self, entry: LedgerEntry) -> Result<LedgerEntry, MongoError> {
        let fallback_entry = entry.clone();

        match self.client.start_session(None).await {
            Ok(session) => match self.record_entry_in_transaction(session, entry).await {
                Ok(result) => Ok(result),
                Err(err) if Self::is_transaction_not_supported(&err) => {
                    log::warn!("Ledger transaction unsupported, falling back to non-transactional write");
                    self.record_entry_without_transaction(fallback_entry).await
                }
                Err(err) => Err(err),
            },
            Err(err) if Self::is_transaction_not_supported(&err) => {
                log::warn!("Ledger session unsupported, falling back to non-transactional write");
                self.record_entry_without_transaction(fallback_entry).await
            }
            Err(err) => Err(err),
        }
    }

    pub async fn query(
        &self,
        org_id: &ObjectId,
        q: LedgerQuery,
    ) -> Result<LedgerResult, MongoError> {
        let filter = Self::build_filter(org_id, q.party_id.as_ref(), &q.from, &q.to);

        let total = self.raw_collection.count_documents(filter.clone(), None).await?;

        let all_cursor = self.raw_collection.find(filter.clone(), None).await?;
        let all_docs: Vec<Document> = all_cursor.try_collect().await?;
        let total_amount_paise: i128 = all_docs
            .iter()
            .map(|doc| {
                let debit = doc.get_i64("debit").unwrap_or(0) as i128;
                let credit = doc.get_i64("credit").unwrap_or(0) as i128;
                credit - debit
            })
            .sum();
        let total_amount = total_amount_paise as f64 / 100.0;

        let mut opts = FindOptions::default();
        opts.sort = Some(doc! { "date": 1, "sequence": 1, "createdAt": 1 });

        if let Some(limit) = q.limit {
            opts.limit = Some(limit);
            if let Some(page) = q.page {
                opts.skip = Some((page.saturating_sub(1)) * limit as u64);
            }
        }

        let mut cursor = self.raw_collection.find(filter, opts).await?;
        let mut data = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(entry) = doc_to_entry(raw) {
                data.push(entry);
            }
        }

        Ok(LedgerResult { data, total, total_amount })
    }

    pub async fn get_counter(&self, party_id: &ObjectId) -> Result<Option<PartyCounter>, MongoError> {
        let raw = self
            .raw_counter_collection
            .find_one(doc! { "_id": party_id }, None)
            .await?;
        Ok(raw.and_then(doc_to_counter))
    }

    /// Update org-level balance counter separately (credit = +, debit = -)
    pub async fn update_org_balance(&self, org_id: &ObjectId, delta: i64) -> Result<i64, MongoError> {
        let now = DateTime::now();
        let init_options = UpdateOptions::builder().upsert(true).build();
        self.counter_collection
            .update_one(
                doc! { "_id": org_id },
                doc! { "$setOnInsert": { "_id": org_id, "sequence": 0i64, "balance": 0i64 } },
                init_options,
            )
            .await?;
        let counter_options = FindOneAndUpdateOptions::builder()
            .upsert(false)
            .return_document(ReturnDocument::After)
            .build();
        let counter = self
            .counter_collection
            .find_one_and_update(
                doc! { "_id": org_id },
                doc! { "$inc": { "balance": delta }, "$set": { "updatedAt": now } },
                counter_options,
            )
            .await?
            .ok_or_else(|| MongoError::custom("Failed to update org balance"))?;
        Ok(counter.balance)
    }

    pub async fn exists(&self, idempotency_key: &str) -> Result<bool, MongoError> {
        let count = self
            .raw_collection
            .count_documents(doc! { "idempotencyKey": idempotency_key }, None)
            .await?;
        Ok(count > 0)
    }
}
