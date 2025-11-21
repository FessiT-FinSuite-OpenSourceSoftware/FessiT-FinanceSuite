pub mod address;
pub mod customer;
pub mod organisation;
pub mod invoice;
pub mod expense; // ✅ added

// Existing exports
pub use customer::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
pub use organisation::{CreateOrganisationRequest, Organisation, UpdateOrganizationRequest};
pub use invoice::{CreateInvoiceRequest, Invoice, UpdateInvoiceRequest};

// ✅ Export Expense models
pub use expense::{CreateExpenseRequest, Expense, UpdateExpenseRequest};
