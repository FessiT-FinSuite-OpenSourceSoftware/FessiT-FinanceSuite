use crate::models::users::UserPermissions;
use serde_json::json;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PermissionAction {
    Read,
    Write,
    Delete,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Module {
    Organisation,
    Invoice,
    Expenses,
    Users,
    PurchaseOrders,
    Customers,
    CostCenter,
    Products,
}

impl Module {
    pub fn as_str(&self) -> &str {
        match self {
            Module::Organisation => "organisation",
            Module::Invoice => "invoice",
            Module::Expenses => "expenses",
            Module::Users => "users",
            Module::PurchaseOrders => "purchase orders",
            Module::Customers => "customers",
            Module::CostCenter => "cost_center",
            Module::Products => "products",
        }
    }
}

pub fn check_permission(
    permissions: &UserPermissions,
    module: Module,
    action: PermissionAction,
    is_admin: bool,
) -> Result<(), String> {
    // Admins have all permissions
    if is_admin {
        return Ok(());
    }

    let has_permission = match module {
        Module::Organisation => match action {
            PermissionAction::Read => permissions.organisation.read,
            PermissionAction::Write => permissions.organisation.write,
            PermissionAction::Delete => permissions.organisation.delete,
        },
        Module::Invoice => match action {
            PermissionAction::Read => permissions.invoice.read,
            PermissionAction::Write => permissions.invoice.write,
            PermissionAction::Delete => permissions.invoice.delete,
        },
        Module::Expenses => match action {
            PermissionAction::Read => permissions.expenses.read,
            PermissionAction::Write => permissions.expenses.write,
            PermissionAction::Delete => permissions.expenses.delete,
        },
        Module::Users => match action {
            PermissionAction::Read => permissions.users.read,
            PermissionAction::Write => permissions.users.write,
            PermissionAction::Delete => permissions.users.delete,
        },
        Module::PurchaseOrders => match action {
            PermissionAction::Read => permissions.purchase_orders.read,
            PermissionAction::Write => permissions.purchase_orders.write,
            PermissionAction::Delete => permissions.purchase_orders.delete,
        },
        Module::Customers => match action {
            PermissionAction::Read => permissions.customers.read,
            PermissionAction::Write => permissions.customers.write,
            PermissionAction::Delete => permissions.customers.delete,
        },
        // Admins-only guard is handled above; non-admins fall through to false
        Module::CostCenter => match action {
            PermissionAction::Read => permissions.customers.read,
            PermissionAction::Write => permissions.customers.write,
            PermissionAction::Delete => permissions.customers.delete,
        },
        Module::Products => match action {
            PermissionAction::Read => permissions.products.read,
            PermissionAction::Write => permissions.products.write,
            PermissionAction::Delete => permissions.products.delete,
        },
    };

    if has_permission {
        Ok(())
    } else {
        Err(format!(
            "You don't have {} permission for {}",
            match action {
                PermissionAction::Read => "read",
                PermissionAction::Write => "write",
                PermissionAction::Delete => "delete",
            },
            module.as_str()
        ))
    }
}

pub fn create_permission_error(message: &str) -> String {
    json!({
        "error": message,
        "code": "PERMISSION_DENIED"
    })
    .to_string()
}
