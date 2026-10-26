export const fmt = (n) => {
  const v = parseFloat(n) || 0;
  return (v < 0 ? "-₹ " : "₹ ") + Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const maskAccountNumber = (value) => {
  if (!value) return "—";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "—";
  return `•••• ${digits.slice(-4)}`;
};

export const truncateText = (value, limit = 16) => {
  if (!value) return "—";
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

export const getConfidenceMeta = (score) => {
  if (score == null || Number.isNaN(Number(score))) return { label: "n/a", tone: "text-slate-500" };
  const value = Number(score);
  if (value > 0.85) return { label: `${(value * 100).toFixed(1)}%`, tone: "text-emerald-600 dark:text-emerald-400" };
  if (value >= 0.6)  return { label: `${(value * 100).toFixed(1)}%`, tone: "text-amber-600 dark:text-amber-400" };
  return { label: `${(value * 100).toFixed(1)}%`, tone: "text-red-600 dark:text-red-400" };
};

export const getTransactionType = (row) => {
  if (row?.type) return row.type;
  if (row?.debit  != null && row?.debit  !== "") return "Debit";
  if (row?.credit != null && row?.credit !== "") return "Credit";
  if (row?.amount != null && row?.amount !== "") return row?.amount < 0 ? "Debit" : "Credit";
  return "Credit";
};

export const getRawOcrDisplay = (data) => {
  if (typeof data === "string") return data.trim() || "No OCR text was returned for this statement.";
  if (data == null) return "No OCR debug output was returned for this statement.";
  const rawText = [
    data.raw_ocr, data.raw_text, data.ocr_text, data.text, data.content,
    data.data?.raw_ocr, data.data?.raw_text, data.data?.ocr_text, data.data?.text,
  ].find((v) => typeof v === "string" && v.trim());
  if (rawText) return rawText;
  const json = JSON.stringify(data, null, 2);
  return json && json !== "{}" ? json : "No OCR debug output was returned for this statement.";
};

export const getApiErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail ?? error?.response?.data?.message ?? error?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((i) => i?.msg || i?.message || JSON.stringify(i)).join(". ");
  if (detail && typeof detail === "object") return detail.msg || detail.message || JSON.stringify(detail);
  return fallback;
};

export const toInputDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const isAllowedFile = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return [".pdf", ".xlsx", ".xls", ".csv"].some((ext) => name.endsWith(ext));
};
