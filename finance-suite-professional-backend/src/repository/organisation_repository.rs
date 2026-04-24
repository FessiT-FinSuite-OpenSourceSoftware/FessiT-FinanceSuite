use mongodb::bson::{doc,oid::ObjectId};
use mongodb::Collection;
use crate::error::ApiError;
use crate::models::{CreateOrganisationRequest,UpdateOrganizationRequest,Organisation};

#[derive(Clone)]
pub struct OrganisationRepository{
    collection:Collection<Organisation>,
}

impl OrganisationRepository{
    pub fn new(collection:Collection<Organisation>)-> Self{
        Self{collection}
    }
    pub async fn create(&self,req:CreateOrganisationRequest)->Result<Organisation,ApiError>{
        let mut organisation = Organisation::new(req);
        let result = self.collection.insert_one(&organisation,None).await?;
        organisation.id = result.inserted_id.as_object_id();
        Ok(organisation)
    }
    pub async fn find_all(&self)-> Result<Vec<Organisation>,ApiError>{
        let mut cursor = self.collection.find(None,None).await?;
        let mut organisation = Vec::new();
        while cursor.advance().await?{
            organisation.push(cursor.deserialize_current()?);
        }
        Ok(organisation)
    }
    pub async fn find_by_email(&self, email: &str) -> Result<Option<Organisation>, ApiError> {
        let filter = doc! { "email": email };
        let result = self
            .collection
            .find_one(filter, None)
            .await
            .map_err(|e| ApiError::DatabaseError(e.to_string()))?;
        Ok(result)
    }
 pub async fn get_organisation_by_email(&self, email: &str) -> Result<Organisation, ApiError> {
    let filter = doc! { "email": email };
    log::info!("🔍 Searching for organisation with email: '{}'", email);
    log::info!("📋 Filter: {:?}", filter);

    match self.collection.find_one(filter, None).await? {
        Some(organisation) => {
            log::info!("✅ Found organisation: {:?} with email: {}", organisation.id, organisation.email);
            Ok(organisation)
        }
        None => {
            log::error!("❌ No organisation found with email: '{}'", email);
            // Let's also check what organisations exist
            let mut cursor = self.collection.find(None, None).await?;
            log::info!("📊 Listing all organisations in database:");
            while cursor.advance().await? {
                if let Ok(org) = cursor.deserialize_current() {
                    log::info!("  - ID: {:?}, Email: {}", org.id, org.email);
                }
            }
            Err(ApiError::NotFound(format!(
                "Organisation with email '{}' not found",
                email
            )))
        }
    }
}


    pub async fn find_by_id(&self, id: &str) -> Result<Option<Organisation>, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };
        let organisation = self.collection.find_one(filter, None).await?;

        Ok(organisation)
    }

    pub async fn get_organisation_by_id(&self, id: &str) -> Result<Organisation, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };
        match self.collection.find_one(filter, None).await? {
            Some(organisation) => Ok(organisation),
            None => Err(ApiError::NotFound(format!(
                "Organisation with id '{}' not found",
                id
            ))),
        }
    }
    pub async fn update(&self, id: &str, req: UpdateOrganizationRequest) -> Result<Organisation, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;

        let filter = doc! { "_id": object_id };

        let mut update_doc = doc! {
            "$set": {
                "updatedAt": mongodb::bson::DateTime::now()
            }
        };

        if let Some(organisation_name) = req.organisation_name {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("organizationName", organisation_name);
        }
        if let Some(company_name) = req.company_name {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("companyName", company_name);
        }
        if let Some(gst_in) = req.gst_in {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("gstIN", gst_in);
        }
        if let Some(addresses) = req.addresses {
            let addresses_bson = mongodb::bson::to_bson(&addresses)
                .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("addresses", addresses_bson);
        }
        if let Some(country) = req.country {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("country", country);
        }
        if let Some(country_code) = req.country_code {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("countryCode", country_code);
        }
       

        if let Some(phone) = req.phone {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("phone", phone);
        }
        if let Some(email) = req.email {
            update_doc
                .get_document_mut("$set")
                .unwrap()
                .insert("email", email);
        }

        // Invoice fields
        if let Some(invoice_prefix) = req.invoice_prefix {
            update_doc.get_document_mut("$set").unwrap().insert("invoicePrefix", invoice_prefix);
        }
        if let Some(starting_invoice_no) = req.starting_invoice_no {
            update_doc.get_document_mut("$set").unwrap().insert("startingInvoiceNo", starting_invoice_no);
        }
        if let Some(date_format) = req.date_format {
            update_doc.get_document_mut("$set").unwrap().insert("dateFormat", date_format);
        }
        if let Some(currency) = req.currency {
            update_doc.get_document_mut("$set").unwrap().insert("currency", currency);
        }
        if let Some(payment_terms) = req.payment_terms {
            update_doc.get_document_mut("$set").unwrap().insert("paymentTerms", payment_terms);
        }
        if let Some(late_payment_fee) = req.late_payment_fee {
            update_doc.get_document_mut("$set").unwrap().insert("latePaymentFee", late_payment_fee);
        }
        if let Some(early_discount) = req.early_discount {
            update_doc.get_document_mut("$set").unwrap().insert("earlyDiscount", early_discount);
        }
        if let Some(discount_days) = req.discount_days {
            update_doc.get_document_mut("$set").unwrap().insert("discountDays", discount_days);
        }
        if let Some(payment_instructions) = req.payment_instructions {
            update_doc.get_document_mut("$set").unwrap().insert("paymentInstructions", payment_instructions);
        }
        if let Some(account_holder) = req.account_holder {
            update_doc.get_document_mut("$set").unwrap().insert("accountHolder", account_holder);
        }
        if let Some(bank_name) = req.bank_name {
            update_doc.get_document_mut("$set").unwrap().insert("bankName", bank_name);
        }
        if let Some(account_number) = req.account_number {
            update_doc.get_document_mut("$set").unwrap().insert("accountNumber", account_number);
        }
        if let Some(ifsc_code) = req.ifsc_code {
            update_doc.get_document_mut("$set").unwrap().insert("ifscCode", ifsc_code);
        }
        if let Some(upi_id) = req.upi_id {
            update_doc.get_document_mut("$set").unwrap().insert("upiId", upi_id);
        }
        if let Some(footer_note) = req.footer_note {
            update_doc.get_document_mut("$set").unwrap().insert("footerNote", footer_note);
        }

        // Tax fields
        if let Some(tax_regime) = req.tax_regime {
            update_doc.get_document_mut("$set").unwrap().insert("taxRegime", tax_regime);
        }
        if let Some(tax_type) = req.tax_type {
            update_doc.get_document_mut("$set").unwrap().insert("taxType", tax_type);
        }
        if let Some(cgst) = req.cgst {
            update_doc.get_document_mut("$set").unwrap().insert("cgst", cgst);
        }
        if let Some(sgst) = req.sgst {
            update_doc.get_document_mut("$set").unwrap().insert("sgst", sgst);
        }
        if let Some(igst) = req.igst {
            update_doc.get_document_mut("$set").unwrap().insert("igst", igst);
        }
        if let Some(input_tax_credit) = req.input_tax_credit {
            update_doc.get_document_mut("$set").unwrap().insert("inputTaxCredit", input_tax_credit);
        }
        if let Some(require_hsn) = req.require_hsn {
            update_doc.get_document_mut("$set").unwrap().insert("requireHSN", require_hsn);
        }
        if let Some(rounding_rule) = req.rounding_rule {
            update_doc.get_document_mut("$set").unwrap().insert("roundingRule", rounding_rule);
        }
        if let Some(tax_notes) = req.tax_notes {
            update_doc.get_document_mut("$set").unwrap().insert("taxNotes", tax_notes);
        }

        // Payment fields
        if let Some(enabled_methods) = req.enabled_methods {
            let enabled_methods_bson = mongodb::bson::to_bson(&enabled_methods)
                .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
            update_doc.get_document_mut("$set").unwrap().insert("enabledMethods", enabled_methods_bson);
        }
        if let Some(payment_bank_name) = req.payment_bank_name {
            update_doc.get_document_mut("$set").unwrap().insert("paymentBankName", payment_bank_name);
        }
        if let Some(payment_account_no) = req.payment_account_no {
            update_doc.get_document_mut("$set").unwrap().insert("paymentAccountNo", payment_account_no);
        }
        if let Some(payment_ifsc) = req.payment_ifsc {
            update_doc.get_document_mut("$set").unwrap().insert("paymentIFSC", payment_ifsc);
        }
        if let Some(payment_account_holder) = req.payment_account_holder {
            update_doc.get_document_mut("$set").unwrap().insert("paymentAccountHolder", payment_account_holder);
        }
        if let Some(payment_upi_id) = req.payment_upi_id {
            update_doc.get_document_mut("$set").unwrap().insert("paymentUpiId", payment_upi_id);
        }
        if let Some(paypal_email) = req.paypal_email {
            update_doc.get_document_mut("$set").unwrap().insert("paypalEmail", paypal_email);
        }
        if let Some(paypal_client_id) = req.paypal_client_id {
            update_doc.get_document_mut("$set").unwrap().insert("paypalClientId", paypal_client_id);
        }
        if let Some(card_provider) = req.card_provider {
            update_doc.get_document_mut("$set").unwrap().insert("cardProvider", card_provider);
        }
        if let Some(card_api_key) = req.card_api_key {
            update_doc.get_document_mut("$set").unwrap().insert("cardApiKey", card_api_key);
        }
        if let Some(cash_instructions) = req.cash_instructions {
            update_doc.get_document_mut("$set").unwrap().insert("cashInstructions", cash_instructions);
        }
        if let Some(custom_payment_name) = req.custom_payment_name {
            update_doc.get_document_mut("$set").unwrap().insert("customPaymentName", custom_payment_name);
        }
        if let Some(new_user_name) = req.new_user_name {
            update_doc.get_document_mut("$set").unwrap().insert("newUserName", new_user_name);
        }
        if let Some(new_user_email) = req.new_user_email {
            update_doc.get_document_mut("$set").unwrap().insert("newUserEmail", new_user_email);
        }
        if let Some(new_user_role) = req.new_user_role {
            update_doc.get_document_mut("$set").unwrap().insert("newUserRole", new_user_role);
        }
        if let Some(new_user_status) = req.new_user_status {
            update_doc.get_document_mut("$set").unwrap().insert("newUserStatus", new_user_status);
        }
        if let Some(permissions) = req.permissions {
            let permissions_bson = mongodb::bson::to_bson(&permissions)
                .map_err(|e| ApiError::InternalServerError(e.to_string()))?;
            update_doc.get_document_mut("$set").unwrap().insert("permissions", permissions_bson);
        }



        self.collection
            .update_one(filter.clone(), update_doc, None)
            .await?;

        let update_organisation = self
            .collection
            .find_one(filter, None)
            .await?
            .ok_or_else(|| ApiError::NotFound("Customer not found after update".to_string()))?;

        Ok(update_organisation)
    }
    
    pub async fn delete(&self, id: &str) -> Result<bool, ApiError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| ApiError::ValidationError("Invalid ID format".to_string()))?;
        println!("🧩 Trying to delete ObjectId: {}", object_id);

        let filter = doc! { "_id": object_id };
        let result = self.collection.delete_one(filter, None).await?;

        Ok(result.deleted_count > 0)
    }

    pub async fn get_next_invoice_sequence(&self, org_email: &str) -> Result<i32, ApiError> {
        log::info!("Getting next invoice sequence for: {}", org_email);
        
        let filter = doc! { "email": org_email };
        let update = doc! {
            "$inc": { "lastInvoiceSequence": 1 }
        };
        
        let options = mongodb::options::FindOneAndUpdateOptions::builder()
            .upsert(false)
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        let result = self.collection.find_one_and_update(filter, update, options).await?;

        match result {
            Some(org) => {
                if let Ok(doc) = mongodb::bson::to_document(&org) {
                    if let Ok(sequence) = doc.get_i32("lastInvoiceSequence") {
                        log::info!("Next sequence number: {}", sequence);
                        return Ok(sequence);
                    }
                }
                log::warn!("Could not get sequence from document, defaulting to 1");
                Ok(1)
            }
            None => {
                log::error!("Organisation not found for email: {}", org_email);
                Err(ApiError::NotFound("Organisation not found".to_string()))
            }
        }
    }

    pub async fn peek_next_invoice_sequence(&self, org_email: &str) -> Result<i32, ApiError> {
        let filter = doc! { "email": org_email };
        let result = self.collection.find_one(filter, None).await?;

        match result {
            Some(org) => {
                if let Ok(doc) = mongodb::bson::to_document(&org) {
                    if let Ok(current_sequence) = doc.get_i32("lastInvoiceSequence") {
                        return Ok(current_sequence + 1);
                    }
                }
                Ok(1)
            }
            None => {
                Err(ApiError::NotFound("Organisation not found".to_string()))
            }
        }
    }

    pub async fn get_next_invoice_sequence_by_id(&self, org_id: &ObjectId) -> Result<i32, ApiError> {
        log::info!("Getting next invoice sequence for org_id: {}", org_id);
        
        let filter = doc! { "_id": org_id };
        let update = doc! {
            "$inc": { "lastInvoiceSequence": 1 }
        };
        
        let options = mongodb::options::FindOneAndUpdateOptions::builder()
            .upsert(false)
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        let result = self.collection.find_one_and_update(filter, update, options).await?;

        match result {
            Some(org) => {
                if let Ok(doc) = mongodb::bson::to_document(&org) {
                    if let Ok(sequence) = doc.get_i32("lastInvoiceSequence") {
                        log::info!("Next sequence number: {}", sequence);
                        return Ok(sequence);
                    }
                }
                log::warn!("Could not get sequence from document, defaulting to 1");
                Ok(1)
            }
            None => {
                log::error!("Organisation not found for id: {}", org_id);
                Err(ApiError::NotFound("Organisation not found".to_string()))
            }
        }
    }

    pub async fn peek_next_invoice_sequence_by_id(&self, org_id: &ObjectId) -> Result<i32, ApiError> {
        let filter = doc! { "_id": org_id };
        let result = self.collection.find_one(filter, None).await?;

        match result {
            Some(org) => {
                if let Ok(doc) = mongodb::bson::to_document(&org) {
                    if let Ok(current_sequence) = doc.get_i32("lastInvoiceSequence") {
                        return Ok(current_sequence + 1);
                    }
                }
                Ok(1)
            }
            None => {
                Err(ApiError::NotFound("Organisation not found".to_string()))
            }
        }
    }

    pub async fn get_user_by_id(&self, _user_id: &str) -> Result<Option<crate::models::users::User>, ApiError> {
        // This would need a users collection reference
        // For now, returning None as this should be called from UserRepository
        Ok(None)
    }

    pub async fn get_next_estimate_sequence_by_id(&self, org_id: &ObjectId) -> Result<i32, ApiError> {
        // Ensure the field exists before incrementing (handles orgs created before this field was added)
        self.collection
            .update_one(
                doc! { "_id": org_id, "lastEstimateSequence": { "$exists": false } },
                doc! { "$set": { "lastEstimateSequence": 0 } },
                None,
            )
            .await?;

        let filter = doc! { "_id": org_id };
        let update = doc! { "$inc": { "lastEstimateSequence": 1 } };
        let options = mongodb::options::FindOneAndUpdateOptions::builder()
            .upsert(false)
            .return_document(mongodb::options::ReturnDocument::After)
            .build();
        let result = self.collection.find_one_and_update(filter, update, options).await?;
        match result {
            Some(org) => Ok(org.last_estimate_sequence),
            None => Err(ApiError::NotFound("Organisation not found".to_string())),
        }
    }

    pub async fn peek_next_estimate_sequence_by_id(&self, org_id: &ObjectId) -> Result<i32, ApiError> {
        let filter = doc! { "_id": org_id };
        let result = self.collection.find_one(filter, None).await?;
        match result {
            Some(org) => Ok(org.last_estimate_sequence + 1),
            None => Err(ApiError::NotFound("Organisation not found".to_string())),
        }
    }
}