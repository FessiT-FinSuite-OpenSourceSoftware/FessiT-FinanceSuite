use std::sync::Arc;

use futures::stream::TryStreamExt;
use mongodb::{
    bson::{doc, from_document, oid::ObjectId, Document},
    error::Error as MongoError,
    options::FindOptions,
    Collection,
};

use crate::models::employee::Employee;

#[derive(Clone)]
pub struct EmployeeRepository {
    collection: Arc<Collection<Employee>>,
    raw_collection: Arc<Collection<Document>>,
}

pub struct EmployeePage {
    pub data: Vec<Employee>,
    pub total: u64,
}

fn doc_to_employee(raw: Document) -> Option<Employee> {
    let oid = raw.get_object_id("_id").ok();
    match from_document::<Employee>(raw) {
        Ok(mut emp) => { emp.id = oid; Some(emp) }
        Err(e) => { log::warn!("[Employee] deserialization failed for {:?}: {}", oid, e); None }
    }
}

fn build_filter(org_id: &ObjectId, search: &str, department: &str, employee_type: &str, status: &str) -> Document {
    let mut filter = doc! { "organisationId": org_id };
    if !search.is_empty() {
        filter.insert("$or", mongodb::bson::Bson::Array(vec![
            doc! { "first_name":      { "$regex": search, "$options": "i" } }.into(),
            doc! { "last_name":       { "$regex": search, "$options": "i" } }.into(),
            doc! { "emp_id":          { "$regex": search, "$options": "i" } }.into(),
            doc! { "email":           { "$regex": search, "$options": "i" } }.into(),
            doc! { "primary_contact": { "$regex": search, "$options": "i" } }.into(),
            doc! { "pan_number":      { "$regex": search, "$options": "i" } }.into(),
        ]));
    }
    if !department.is_empty()    { filter.insert("department",     department); }
    if !employee_type.is_empty() { filter.insert("employee_type",  employee_type); }
    if !status.is_empty()        { filter.insert("status",         status); }
    filter
}

impl EmployeeRepository {
    pub fn new(collection: Collection<Employee>) -> Self {
        let raw_collection = collection.clone_with_type::<Document>();
        Self {
            collection: Arc::new(collection),
            raw_collection: Arc::new(raw_collection),
        }
    }

    pub async fn create(&self, mut employee: Employee) -> Result<Employee, MongoError> {
        let result = self.collection.insert_one(&employee, None).await?;
        if let Some(id) = result.inserted_id.as_object_id() {
            employee.id = Some(id);
        }
        Ok(employee)
    }

    /// Returns one page of employees plus the total matching count.
    pub async fn get_page(
        &self,
        org_id: &ObjectId,
        search: &str,
        department: &str,
        employee_type: &str,
        status: &str,
        page: u64,
        page_size: u64,
    ) -> Result<EmployeePage, MongoError> {
        let filter = build_filter(org_id, search, department, employee_type, status);
        let total = self.raw_collection.count_documents(filter.clone(), None).await?;

        let opts = FindOptions::builder()
            .skip((page.saturating_sub(1)) * page_size)
            .limit(page_size as i64)
            .sort(doc! { "emp_id": 1 })
            .build();

        let mut cursor = self.raw_collection.find(filter, opts).await?;
        let mut data = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_employee(raw) { data.push(e); }
        }
        Ok(EmployeePage { data, total })
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<Employee>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        let raw = self.raw_collection.find_one(doc! { "_id": oid }, None).await?;
        Ok(raw.and_then(doc_to_employee))
    }

    pub async fn get_all_for_org(&self, org_id: &ObjectId) -> Result<Vec<Employee>, MongoError> {
        let mut cursor = self.raw_collection.find(doc! { "organisationId": org_id }, None).await?;
        let mut data = Vec::new();
        while let Some(raw) = cursor.try_next().await.unwrap_or(None) {
            if let Some(e) = doc_to_employee(raw) { data.push(e); }
        }
        Ok(data)
    }

    pub async fn update(&self, id: &str, mut employee: Employee) -> Result<Option<Employee>, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(None) };
        employee.id = Some(oid);
        let result = self.collection.replace_one(doc! { "_id": oid }, employee, None).await?;
        if result.matched_count == 0 { return Ok(None); }
        self.get_by_id(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, MongoError> {
        let oid = match ObjectId::parse_str(id) { Ok(o) => o, Err(_) => return Ok(false) };
        let result = self.collection.delete_one(doc! { "_id": oid }, None).await?;
        Ok(result.deleted_count > 0)
    }
}
