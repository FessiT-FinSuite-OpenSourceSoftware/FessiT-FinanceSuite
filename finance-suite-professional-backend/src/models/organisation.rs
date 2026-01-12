use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

use super::address::Address;

//
// ================= ORGANISATION =================
//

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Organisation {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(rename = "organizationName", default)]
    pub organisation_name: String,

    #[serde(rename = "companyName", default)]
    pub company_name: String,

    #[serde(rename = "gstIN", default)]
    pub gst_in: String,

    #[serde(default)]
    pub addresses: Vec<Address>,

    #[serde(default)]
    pub country: String,

    #[serde(rename = "countryCode", default)]
    pub country_code: String,

    #[serde(default)]
    pub phone: String,

    #[serde(default)]
    pub email: String,

    // -------- Invoice Settings --------
    #[serde(rename = "invoicePrefix", default)]
    pub invoice_prefix: String,

    #[serde(rename = "startingInvoiceNo", default)]
    pub starting_invoice_no: String,

    #[serde(rename = "dateFormat", default)]
    pub date_format: String,

    #[serde(default)]
    pub currency: String,

    #[serde(rename = "paymentTerms", default)]
    pub payment_terms: String,

    #[serde(rename = "latePaymentFee", default)]
    pub late_payment_fee: String,

    #[serde(rename = "earlyDiscount", default)]
    pub early_discount: String,

    #[serde(rename = "discountDays", default)]
    pub discount_days: String,

    #[serde(rename = "paymentInstructions", default)]
    pub payment_instructions: String,

    #[serde(rename = "accountHolder", default)]
    pub account_holder: String,

    #[serde(rename = "bankName", default)]
    pub bank_name: String,

    #[serde(rename = "accountNumber", default)]
    pub account_number: String,

    #[serde(rename = "ifscCode", default)]
    pub ifsc_code: String,

    #[serde(rename = "upiId", default)]
    pub upi_id: String,

    #[serde(rename = "footerNote", default)]
    pub footer_note: String,

    // -------- Tax Settings --------
    #[serde(rename = "taxRegime", default)]
    pub tax_regime: String,

    #[serde(rename = "taxType", default)]
    pub tax_type: String,

    #[serde(default)]
    pub cgst: String,

    #[serde(default)]
    pub sgst: String,

    #[serde(default)]
    pub igst: String,

    #[serde(rename = "inputTaxCredit", default)]
    pub input_tax_credit: String,

    #[serde(rename = "requireHSN", default)]
    pub require_hsn: String,

    #[serde(rename = "roundingRule", default)]
    pub rounding_rule: String,

    #[serde(rename = "taxNotes", default)]
    pub tax_notes: String,

    // -------- Users & Roles --------
    #[serde(rename = "newUserName", default)]
    pub new_user_name: String,

    #[serde(rename = "newUserEmail", default)]
    pub new_user_email: String,

    #[serde(rename = "newUserRole", default)]
    pub new_user_role: String,

    #[serde(rename = "newUserStatus", default)]
    pub new_user_status: String,

    #[serde(default)]
    pub permissions: Permissions,

    // -------- Payment Methods --------
    #[serde(rename = "enabledMethods", default)]
    pub enabled_methods: EnabledMethods,

    #[serde(rename = "paymentBankName", default)]
    pub payment_bank_name: String,

    #[serde(rename = "paymentAccountNo", default)]
    pub payment_account_no: String,

    #[serde(rename = "paymentIFSC", default)]
    pub payment_ifsc: String,

    #[serde(rename = "paymentAccountHolder", default)]
    pub payment_account_holder: String,

    #[serde(rename = "paymentUpiId", default)]
    pub payment_upi_id: String,

    #[serde(rename = "paypalEmail", default)]
    pub paypal_email: String,

    #[serde(rename = "paypalClientId", default)]
    pub paypal_client_id: String,

    #[serde(rename = "cardProvider", default)]
    pub card_provider: String,

    #[serde(rename = "cardApiKey", default)]
    pub card_api_key: String,

    #[serde(rename = "cashInstructions", default)]
    pub cash_instructions: String,

    #[serde(rename = "customPaymentName", default)]
    pub custom_payment_name: String,
}

//
// ================= CREATE REQUEST =================
//

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOrganisationRequest {
    #[serde(rename = "organizationName")]
    pub organisation_name: String,

    #[serde(rename = "companyName")]
    pub company_name: String,

    #[serde(rename = "gstIN")]
    pub gst_in: String,

    pub addresses: Vec<Address>,
    pub country: String,

    #[serde(rename = "countryCode")]
    pub country_code: String,

    pub phone: String,
    pub email: String,

    // Invoice
    pub invoice_prefix: String,
    pub starting_invoice_no: String,
    pub date_format: String,
    pub currency: String,
    pub payment_terms: String,
    pub late_payment_fee: String,
    pub early_discount: String,
    pub discount_days: String,
    pub payment_instructions: String,
    pub account_holder: String,
    pub bank_name: String,
    pub account_number: String,
    pub ifsc_code: String,
    pub upi_id: String,
    pub footer_note: String,

    // Tax
    pub tax_regime: String,
    pub tax_type: String,
    pub cgst: String,
    pub sgst: String,
    pub igst: String,
    pub input_tax_credit: String,
    pub require_hsn: String,
    pub rounding_rule: String,
    pub tax_notes: String,

    // Users
    pub new_user_name: String,
    pub new_user_email: String,
    pub new_user_role: String,
    pub new_user_status: String,

    pub permissions: Permissions,

    // Payment
    pub enabled_methods: EnabledMethods,
    pub payment_bank_name: String,
    pub payment_account_no: String,
    pub payment_ifsc: String,
    pub payment_account_holder: String,
    pub payment_upi_id: String,
    pub paypal_email: String,
    pub paypal_client_id: String,
    pub card_provider: String,
    pub card_api_key: String,
    pub cash_instructions: String,
    pub custom_payment_name: String,
}

//
// ================= UPDATE REQUEST =================
//

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateOrganizationRequest {
    #[serde(rename = "organizationName")]

    pub organisation_name: Option<String>,
    #[serde(rename = "companyName")]

    pub company_name: Option<String>,
    #[serde(rename = "gstIN")]

    pub gst_in: Option<String>,

    pub addresses: Option<Vec<Address>>,
    pub country: Option<String>,
        #[serde(rename = "countryCode")]

    pub country_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,

    pub invoice_prefix: Option<String>,
    pub starting_invoice_no: Option<String>,
    pub date_format: Option<String>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub late_payment_fee: Option<String>,
    pub early_discount: Option<String>,
    pub discount_days: Option<String>,
    pub payment_instructions: Option<String>,
    pub account_holder: Option<String>,
    pub bank_name: Option<String>,
    pub account_number: Option<String>,
    pub ifsc_code: Option<String>,
    pub upi_id: Option<String>,
    pub footer_note: Option<String>,

    pub tax_regime: Option<String>,
    pub tax_type: Option<String>,
    pub cgst: Option<String>,
    pub sgst: Option<String>,
    pub igst: Option<String>,
    pub input_tax_credit: Option<String>,
    pub require_hsn: Option<String>,
    pub rounding_rule: Option<String>,
    pub tax_notes: Option<String>,

    pub new_user_name: Option<String>,
    pub new_user_email: Option<String>,
    pub new_user_role: Option<String>,
    pub new_user_status: Option<String>,

    pub permissions: Option<Permissions>,
    pub enabled_methods: Option<EnabledMethods>,

    pub payment_bank_name: Option<String>,
    pub payment_account_no: Option<String>,
    pub payment_ifsc: Option<String>,
    pub payment_account_holder: Option<String>,
    pub payment_upi_id: Option<String>,
    pub paypal_email: Option<String>,
    pub paypal_client_id: Option<String>,
    pub card_provider: Option<String>,
    pub card_api_key: Option<String>,
    pub cash_instructions: Option<String>,
    pub custom_payment_name: Option<String>,
}

//
// ================= PERMISSIONS =================
//

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PermissionSet {
    pub view: bool,
    pub edit: bool,
    pub delete: bool,
    pub export: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Permissions {
    pub Admin: PermissionSet,
    pub Manager: PermissionSet,
    pub Accountant: PermissionSet,
    pub Viewer: PermissionSet,
    pub Custom: PermissionSet,
}

//
// ================= PAYMENT METHODS =================
//

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EnabledMethods {
    pub bankTransfer: bool,
    pub upi: bool,
    pub card: bool,
    pub paypal: bool,
    pub cash: bool,
}
impl Organisation {
    pub fn new(req: CreateOrganisationRequest) -> Self {
        Self {
            id: None,

            organisation_name: req.organisation_name,
            company_name: req.company_name,
            gst_in: req.gst_in,
            addresses: req.addresses,
            country: req.country,
            country_code: req.country_code,
            phone: req.phone,
            email: req.email,

            // Invoice
            invoice_prefix: req.invoice_prefix,
            starting_invoice_no: req.starting_invoice_no,
            date_format: req.date_format,
            currency: req.currency,
            payment_terms: req.payment_terms,
            late_payment_fee: req.late_payment_fee,
            early_discount: req.early_discount,
            discount_days: req.discount_days,
            payment_instructions: req.payment_instructions,
            account_holder: req.account_holder,
            bank_name: req.bank_name,
            account_number: req.account_number,
            ifsc_code: req.ifsc_code,
            upi_id: req.upi_id,
            footer_note: req.footer_note,

            // Tax
            tax_regime: req.tax_regime,
            tax_type: req.tax_type,
            cgst: req.cgst,
            sgst: req.sgst,
            igst: req.igst,
            input_tax_credit: req.input_tax_credit,
            require_hsn: req.require_hsn,
            rounding_rule: req.rounding_rule,
            tax_notes: req.tax_notes,

            // Users
            new_user_name: req.new_user_name,
            new_user_email: req.new_user_email,
            new_user_role: req.new_user_role,
            new_user_status: req.new_user_status,
            permissions: req.permissions,

            // Payment
            enabled_methods: req.enabled_methods,
            payment_bank_name: req.payment_bank_name,
            payment_account_no: req.payment_account_no,
            payment_ifsc: req.payment_ifsc,
            payment_account_holder: req.payment_account_holder,
            payment_upi_id: req.payment_upi_id,
            paypal_email: req.paypal_email,
            paypal_client_id: req.paypal_client_id,
            card_provider: req.card_provider,
            card_api_key: req.card_api_key,
            cash_instructions: req.cash_instructions,
            custom_payment_name: req.custom_payment_name,
        }
    }
}
