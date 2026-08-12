export const SAVED_COLS = [
  { label: "Date" }, { label: "Reference" }, { label: "Narration" },
  { label: "Debit", right: true }, { label: "Credit", right: true }, { label: "Balance", right: true },
  { label: "Notes" }, { label: "Status" }, { label: "Category" },
  { label: "", right: true },
];

// export const TRANSACTION_CATEGORIES = ["General", "Reimbursement", "Capital","Sales","Purchases","Salary","Arrears","Contract","Consultation", "Debt Taken", "Debt Repaid"];
export const TRANSACTION_CATEGORIES = [
  "Sales",
  "Purchases",
  "Capital",
  "Salary",
  "Consultation",
  "Contract",
  "Reimbursement",
  "Arrears",
  "Debt Taken",
  "Debt Repaid",
  "General",
];
// export const CATEGORY_COLORS = {
//   General:       "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
//   Reimbursement: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
//   Invoices:      "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400",
//   Salary:        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
// }

export const CATEGORY_COLORS = {
  General:       "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  Reimbursement: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  Capital:       "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  Sales:         "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  Purchases:     "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  Salary:        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  Arrears:       "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  Contract:      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  Consultation:  "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
  "Debt Taken":  "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  "Debt Repaid": "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400",
};
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
