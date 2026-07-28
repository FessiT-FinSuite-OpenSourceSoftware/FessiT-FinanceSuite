export const SAVED_COLS = [
  { label: "Date" }, { label: "Reference" }, { label: "Narration" },
  { label: "Debit", right: true }, { label: "Credit", right: true }, { label: "Balance", right: true },
  { label: "Notes" }, { label: "Status" }, { label: "Category" },
  { label: "", right: true },
];

export const TRANSACTION_CATEGORIES = ["General", "Reimbursement", "Invoices", "Salary"];

export const inputCls = "w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400";
export const selectCls = inputCls + " cursor-pointer";

export const STATUS_META = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  reviewed: { label: "Reviewed", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};
export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }));

export const ACCEPTED = ".pdf,.xlsx,.xls,.csv";
export const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv"];
export const EMPTY_ROW = () => ({ date: "", description: "", reference: "", category: "", type: "Credit", amount: "", balance: "" });
export const EMPTY_MANUAL = () => ({ date: "", narration: "", reference: "", category: "", debit: "", credit: "", balance: "" });
