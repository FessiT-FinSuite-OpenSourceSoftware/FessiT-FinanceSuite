// Mirrors the backend Module enum
export const Module = {
  Invoice: "invoice",
  Expenses: "expenses",
  PurchaseOrders: "purchaseOrders",
  Customers: "customers",
  Items: "items",
  Products: "products",
  Users: "users",
  Organisation: "organisation",
  Transactions: "transactions",
};

/**
 * Returns true if the user has read access to the given module.
 * Admins and accountants bypass all permission checks.
 */
export const canRead = (user, module) => {
  if (!user) return false;
  if (user.is_admin || user.is_accountant) return true;
  return user.permissions?.[module]?.read === true;
};

/**
 * Returns true if the user has write access to the given module.
 */
export const canWrite = (user, module) => {
  if (!user) return false;
  if (user.is_admin) return true;
  return user.permissions?.[module]?.write === true;
};

/**
 * Returns true if the user has delete access to the given module.
 */
export const canDelete = (user, module) => {
  if (!user) return false;
  if (user.is_admin) return true;
  return user.permissions?.[module]?.delete === true;
};
