pub mod customer_handler;
pub mod organisation_handler;
pub mod invoice_handler;
pub mod incoming_invoice_handler;
pub mod expense_handler;
pub mod users;
pub mod purchase_order_handler;
pub mod cost_center_handler;

pub use customer_handler::configure_routes as configure_customer_routes;
pub use organisation_handler::{configure_routes as configure_organisation_routes, configure_public_routes as configure_organisation_public_routes};
pub use invoice_handler::configure_routes as configure_invoice_routes;
pub use incoming_invoice_handler::configure_routes as configure_incoming_invoice_routes;
pub use expense_handler::configure_routes as configure_expense_routes;
pub use users::{configure_routes as configure_user_routes, configure_protected_routes as configure_protected_user_routes};
pub use purchase_order_handler::configure_routes as configure_purchase_order_routes;
pub use cost_center_handler::configure_routes as configure_cost_center_routes;
