import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  FileText, X, Check, Trash2, Edit2, Save, Plus,
  CloudUpload, RefreshCw, AlertCircle, Eye, EyeOff, PenLine,
} from "lucide-react";
import {
  transactionsSelector, fetchTransactions, uploadStatement,
  saveExtracted, updateTransaction, deleteTransaction,
  clearExtracted, setUploadError,
} from "../../ReduxApi/transactions";
import { KeyUri } from "../../shared/key";
import {
  StatCard, TabActionBar, FilterSelect, Pagination,
  ConfirmModal, TableWrapper, TableHead,
} from "../../shared/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  "₹ " + Math.abs(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const maskAccountNumber = (value) => {
  if (!value) return "—";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "—";
  return `•••• ${digits.slice(-4)}`;
};

const truncateText = (value, limit = 16) => {
  if (!value) return "—";
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const getConfidenceMeta = (score) => {
  if (score == null || Number.isNaN(Number(score))) return { label: "n/a", tone: "text-slate-500" };
  const value = Number(score);
  if (value > 0.85) return { label: `${(value * 100).toFixed(1)}%`, tone: "text-emerald-600 dark:text-emerald-400" };
  if (value >= 0.6) return { label: `${(value * 100).toFixed(1)}%`, tone: "text-amber-600 dark:text-amber-400" };
  return { label: `${(value * 100).toFixed(1)}%`, tone: "text-red-600 dark:text-red-400" };
};

const getTransactionType = (row) => {
  if (row?.type) return row.type;
  if (row?.debit != null && row?.debit !== "") return "Debit";
  if (row?.credit != null && row?.credit !== "") return "Credit";
  if (row?.amount != null && row?.amount !== "") return row?.amount < 0 ? "Debit" : "Credit";
  return "Credit";
};

// The OCR debug endpoint can return either plain text or a JSON object, depending
// on the OCR service version. Prefer the actual OCR text when it is present so
// the raw view never renders as an apparently empty JSON response.
const getRawOcrDisplay = (data) => {
  if (typeof data === "string") return data.trim() || "No OCR text was returned for this statement.";
  if (data == null) return "No OCR debug output was returned for this statement.";

  const rawText = [
    data.raw_ocr,
    data.raw_text,
    data.ocr_text,
    data.text,
    data.content,
    data.data?.raw_ocr,
    data.data?.raw_text,
    data.data?.ocr_text,
    data.data?.text,
  ].find((value) => typeof value === "string" && value.trim());

  if (rawText) return rawText;

  const json = JSON.stringify(data, null, 2);
  return json && json !== "{}" ? json : "No OCR debug output was returned for this statement.";
};

const getApiErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail ?? error?.response?.data?.message ?? error?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join(". ");
  }
  if (detail && typeof detail === "object") return detail.msg || detail.message || JSON.stringify(detail);
  return fallback;
};

// Converts any parseable date value into the strict yyyy-MM-dd format
// required by <input type="date">'s value prop. Without this, dates like
// "01 Jul 2026" fail to populate the native date picker.
const toInputDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ACCEPTED = ".pdf,.xlsx,.xls,.csv";
const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv"];
const EMPTY_ROW = () => ({ date: "", description: "", reference: "", category: "", type: "Credit", amount: "", balance: "" });
const EMPTY_MANUAL = () => ({ date: "", narration: "", reference: "", category: "", debit: "", credit: "", balance: "" });

// ── Add Transaction Modal ─────────────────────────────────────────────────────
function AddTransactionModal({ onSave, onClose, isSaving }) {
  const [form, setForm] = useState(EMPTY_MANUAL());
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const valid = form.narration.trim() && (form.debit || form.credit);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const debit  = form.debit  === "" ? null : parseFloat(form.debit);
    const credit = form.credit === "" ? null : parseFloat(form.credit);
    const balance = form.balance === "" ? null : parseFloat(form.balance);
    onSave([{
      date:      form.date,
      narration: form.narration.trim(),
      description: form.narration.trim(),
      reference: form.reference.trim(),
      category:  form.category.trim(),
      debit, credit, balance,
      amount: debit ?? credit ?? 0,
      type: debit != null ? "Debit" : "Credit",
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Add Transaction</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={set("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Reference</label>
              <input type="text" value={form.reference} onChange={set("reference")} placeholder="Ref / Cheque no." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Narration <span className="text-red-400">*</span></label>
            <input type="text" value={form.narration} onChange={set("narration")} placeholder="Transaction description" className={inputCls} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Debit</label>
              <input type="number" step="0.01" min="0" value={form.debit} onChange={set("debit")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Credit</label>
              <input type="number" step="0.01" min="0" value={form.credit} onChange={set("credit")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Balance</label>
              <input type="number" step="0.01" value={form.balance} onChange={set("balance")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Category</label>
            <input type="text" value={form.category} onChange={set("category")} placeholder="e.g. Salary, Rent…" className={inputCls} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!valid || isSaving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PDF Password Modal ────────────────────────────────────────────────────────
function PdfPasswordModal({ isWrongPassword, onSubmit, onCancel }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (value) onSubmit(value);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">Password-Protected PDF</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          {isWrongPassword
            ? "Incorrect password, try again."
            : "This PDF is password-protected. Enter the password to continue."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="PDF password"
              autoComplete="off"
              className={`${inputCls} pr-8 ${isWrongPassword ? "border-red-400 dark:border-red-600" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!value} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SAVED_COLS = [
  { label: "Date" }, { label: "Reference" }, { label: "Narration" },
  { label: "Debit", right: true }, { label: "Credit", right: true }, { label: "Balance", right: true }, { label: "", right: true },
];

const inputCls = "w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400";
const selectCls = inputCls + " cursor-pointer";

const isAllowedFile = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, disabled }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const handle = (f) => { if (f && !disabled) onFile(f); };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); !disabled && setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => !disabled && ref.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition-colors select-none
        ${disabled ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-700" :
          drag ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" :
          "border-gray-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${drag ? "bg-indigo-200 dark:bg-indigo-800" : "bg-indigo-100 dark:bg-indigo-900/40"}`}>
        <CloudUpload className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          {drag ? "Drop to upload" : "Drop your bank statement here"}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">PDF, XLSX, or CSV · Max 20 MB</p>
        <p className="text-xs text-indigo-500 mt-1 font-medium">or click to browse</p>
      </div>
      <input ref={ref} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handle(e.target.files[0])} />
    </div>
  );
}

// ── Processing Spinner ────────────────────────────────────────────────────────
function ProcessingCard({ fileName, stage, liveCount }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  const stageCopy = {
    uploading:  "Uploading statement…",
    extracting: "Extracting text from the document… This may take about 30–60 seconds.",
    parsing:    liveCount > 0
      ? `Parsing… ${liveCount} transaction${liveCount !== 1 ? "s" : ""} found so far`
      : "Parsing extracted data…",
  };

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="w-6 h-6 text-indigo-500" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{stageCopy[stage] || `Processing statement${dots}`}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs truncate">{fileName}</p>
      </div>
    </div>
  );
}

function NarrationCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <span className="text-gray-500 dark:text-slate-400">—</span>;
  return (
    <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full text-left">
      <span className={`block ${expanded ? "whitespace-normal" : "truncate"}`} title={value}>
        {value}
      </span>
    </button>
  );
}

function ReviewTable({ rows, isEditing, onChange, onRemove, onAddRow, page = 1, pageSize = 10, onPageChange, onPageSizeChange, isStreaming = false }) {
  const headers = ["#", "Date", "Reference", "Narration", "Debit", "Credit", "Balance"];
  if (isEditing) headers.push("");
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap${isStreaming && i === headers.length - 1 ? " flex items-center gap-2" : ""}` }>
                {h}
                {isStreaming && i === headers.length - 1 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-indigo-500 normal-case tracking-normal">
                    <RefreshCw className="w-3 h-3 animate-spin" /> live
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {pageRows.map((row, i) => {
            const i_abs = (page - 1) * pageSize + i;
            const tone = row.debit != null && row.debit !== ""
              ? "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/40"
              : row.credit != null && row.credit !== ""
              ? "bg-green-50/70 hover:bg-green-100/70 dark:bg-green-950/30 dark:hover:bg-green-950/40"
              : "bg-white hover:bg-indigo-50/20 dark:bg-slate-950 dark:hover:bg-indigo-950/10";
            return (
              <tr key={i} className={tone}>
                <td className="px-3 py-1.5 text-gray-400 dark:text-slate-600 w-8">{i_abs + 1}</td>
                <td className="px-2 py-1.5 min-w-[120px]">
                  {isEditing ? (
                    <input type="date" value={toInputDate(row.date)} onChange={(e) => onChange(i_abs, "date", e.target.value)} className={inputCls} />
                  ) : (
                    <span className="text-gray-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(row.date)}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 min-w-[140px]">
                  {isEditing ? (
                    <input type="text" value={row.reference ?? ""} onChange={(e) => onChange(i_abs, "reference", e.target.value)} className={inputCls} placeholder="Reference" />
                  ) : (
                    <span className="block max-w-[140px] truncate font-mono text-indigo-600 dark:text-indigo-400" title={row.reference || undefined}>{truncateText(row.reference, 16)}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 min-w-[220px]">
                  {isEditing ? (
                    <input type="text" value={row.narration ?? row.description ?? ""} onChange={(e) => onChange(i_abs, "narration", e.target.value)} className={inputCls} placeholder="Narration" />
                  ) : (
                    <NarrationCell value={row.narration ?? row.description} />
                  )}
                </td>
                <td className="px-2 py-1.5 min-w-[110px]">
                  {isEditing ? (
                    <input type="number" step="0.01" value={row.debit ?? ""} onChange={(e) => onChange(i_abs, "debit", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                  ) : (
                    <span className="block text-right font-semibold text-red-600 dark:text-red-400">{row.debit == null || row.debit === "" ? "—" : fmt(row.debit)}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 min-w-[110px]">
                  {isEditing ? (
                    <input type="number" step="0.01" value={row.credit ?? ""} onChange={(e) => onChange(i_abs, "credit", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                  ) : (
                    <span className="block text-right font-semibold text-green-600 dark:text-green-400">{row.credit == null || row.credit === "" ? "—" : fmt(row.credit)}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 min-w-[110px]">
                  {isEditing ? (
                    <input type="number" step="0.01" value={row.balance ?? ""} onChange={(e) => onChange(i_abs, "balance", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                  ) : (
                    <span className="block text-right font-semibold text-gray-700 dark:text-slate-200">{row.balance == null || row.balance === "" ? "—" : fmt(row.balance)}</span>
                  )}
                </td>
                {isEditing && (
                  <td className="px-2 py-1.5">
                    <button onClick={() => onRemove(i_abs)} className="p-1 rounded text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors" title="Remove row">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="px-6 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                No rows to save. Add a row or discard this import.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      {isEditing && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
          <button onClick={onAddRow} className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add row
          </button>
        </div>
      )}
      {rows.length > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={rows.length}
          onPageChange={onPageChange}
          onPageSizeChange={(n) => { onPageSizeChange(n); onPageChange(1); }}
        />
      )}
    </div>
  );
}

const SavedRow = React.memo(function SavedRow({ row, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    ...row,
    narration: row.narration ?? row.description ?? "",
    debit: row.debit ?? (getTransactionType(row) === "Debit" ? row.amount ?? "" : ""),
    credit: row.credit ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
    balance: row.balance ?? "",
  });
  useEffect(() => {
    setDraft({
      ...row,
      narration: row.narration ?? row.description ?? "",
      debit: row.debit ?? (getTransactionType(row) === "Debit" ? row.amount ?? "" : ""),
      credit: row.credit ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
      balance: row.balance ?? "",
    });
  }, [row]);

  const f = (key, type = "text") => (
    <input
      type={type}
      value={type === "date" ? toInputDate(draft[key]) : (draft[key] ?? "")}
      onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
      onClick={(e) => e.stopPropagation()}
      className="w-full border border-indigo-300 dark:border-indigo-700 rounded px-2 py-0.5 text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );

  const debitValue = row.debit != null ? row.debit : (getTransactionType(row) === "Debit" ? row.amount : null);
  const creditValue = row.credit != null ? row.credit : (getTransactionType(row) === "Credit" ? row.amount : null);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors group">
      <td className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
        {editing ? f("date", "date") : fmtDate(row.date)}
      </td>
      <td className="px-4 py-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap min-w-[140px]">
        {editing ? f("reference") : truncateText(row.reference, 16)}
      </td>
      <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-slate-100 max-w-60">
        {editing ? f("narration") : <span className="block truncate" title={row.narration ?? row.description}>{row.narration ?? row.description ?? "-"}</span>}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
        {editing ? f("debit", "number") : (debitValue == null || debitValue === "" ? "—" : fmt(debitValue))}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
        {editing ? f("credit", "number") : (creditValue == null || creditValue === "" ? "—" : fmt(creditValue))}
      </td>
      <td className="px-4 py-2 text-right text-sm font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap">
        {row.balance != null ? fmt(row.balance) : "-"}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {editing ? (
            <>
              <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" title="Save"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setDraft({ ...row, narration: row.narration ?? row.description ?? "", debit: row.debit ?? (getTransactionType(row) === "Debit" ? row.amount ?? "" : ""), credit: row.credit ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""), balance: row.balance ?? "" }); setEditing(false); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800" title="Cancel"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

function MetaChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">{label}</p>
      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mt-0.5 truncate">{value}</p>
    </div>
  );
}

// ── Stable row wrapper (avoids new callbacks on every parent render) ────────────
const SavedRowWrapper = React.memo(function SavedRowWrapper({ row, id, dispatch, setDeleteConfirm }) {
  const onSave   = useCallback((draft) => dispatch(updateTransaction(id, draft)), [dispatch, id]);
  const onDelete = useCallback(() => setDeleteConfirm(id), [setDeleteConfirm, id]);
  return <SavedRow row={row} onSave={onSave} onDelete={onDelete} />;
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function Transactions() {
  const dispatch = useDispatch();
  const { isLoading, isUploading, isStreaming, isSaving, entries, extracted, uploadError, statementMeta, uploadStage } = useSelector(transactionsSelector);

  const [reviewRows, setReviewRows] = useState([]);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize, setReviewPageSize] = useState(10);
  const [pendingFile, setPendingFile] = useState(null);
  const [pdfPasswordState, setPdfPasswordState] = useState(null); // null | { file, isWrongPassword }
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const debugApi = useMemo(() => axios.create({ baseURL: KeyUri.OCR_URI, timeout: 300_000 }), []);

  useEffect(() => {
    // During streaming, append only the newly arrived rows instead of replacing all
    if (!extracted.length) return;
    setReviewRows((prev) => {
      if (prev.length === extracted.length) return prev; // nothing new
      if (prev.length === 0) { setReviewPage(1); return extracted.map((r) => ({ ...r })); }
      return [...prev, ...extracted.slice(prev.length).map((r) => ({ ...r }))];
    });
  }, [extracted]);

  useEffect(() => { dispatch(fetchTransactions()); }, [dispatch]);

  const handleFileSelected = useCallback((file) => {
    if (!isAllowedFile(file)) {
      dispatch(setUploadError("Unsupported file type. Please upload a PDF, XLSX, or CSV file."));
      return;
    }
    setPendingFile(file);
    // First attempt — no password. If the PDF is encrypted the thunk returns
    // the error_type string instead of a number so we can prompt here.
    dispatch(uploadStatement(file)).then((result) => {
      if (result === "password_required") {
        setPdfPasswordState({ file, isWrongPassword: false });
      }
    });
  }, [dispatch]);

  const handlePasswordSubmit = useCallback((password) => {
    const { file } = pdfPasswordState;
    setPdfPasswordState(null);
    dispatch(uploadStatement(file, password)).then((result) => {
      if (result === "invalid_password") {
        setPdfPasswordState({ file, isWrongPassword: true });
      }
    });
  }, [dispatch, pdfPasswordState]);

  const handlePasswordCancel = useCallback(() => {
    setPdfPasswordState(null);
    dispatch(setUploadError(null));
    setPendingFile(null);
  }, [dispatch]);

  const handleRowChange = useCallback((i, key, val) => {
    setReviewRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  }, []);
  const handleRemoveRow = useCallback((i) => setReviewRows((prev) => prev.filter((_, idx) => idx !== i)), []);
  const handleAddRow = useCallback(() => setReviewRows((prev) => [...prev, EMPTY_ROW()]), []);
  const handleRawViewToggle = useCallback(async () => {
    if (showDebug) {
      setShowDebug(false);
      return;
    }
    if (!pendingFile) {
      dispatch(setUploadError("Upload a statement first to inspect the raw OCR output."));
      return;
    }

    setDebugLoading(true);
    dispatch(setUploadError(null));
    try {
      const form = new FormData();
      // The debug route accepts one UploadFile (unlike /bank-statement,
      // which accepts a list named "files").
      form.append("file", pendingFile);
      const { data } = await debugApi.post("/ocr/debug", form);
      setDebugData(data);
      setShowDebug(true);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Unable to load OCR debug output.");
      dispatch(setUploadError(msg));
    } finally {
      setDebugLoading(false);
    }
  }, [debugApi, dispatch, pendingFile, showDebug]);
  const handleDiscard = () => {
    dispatch(clearExtracted());
    setReviewRows([]);
    setIsEditingReview(false);
    setPendingFile(null);
    setShowDebug(false);
    setDebugData(null);
  };
  const handleSaveAll = async () => {
    const rowsToSave = reviewRows
      .filter((r) => r.narration || r.description || r.reference || r.debit || r.credit)
      .map((r) => {
        const narration = (r.narration ?? r.description ?? "").trim();
        const debit = r.debit === "" || r.debit == null ? null : parseFloat(r.debit);
        const credit = r.credit === "" || r.credit == null ? null : parseFloat(r.credit);
        const balance = r.balance === "" || r.balance == null
          ? null
          : (Number.isFinite(parseFloat(r.balance)) ? parseFloat(r.balance) : null);
        return {
          ...r,
          narration,
          description: narration,
          reference: (r.reference ?? "").trim(),
          category: (r.category ?? "").trim(),
          debit,
          credit,
          balance,
          amount: debit ?? credit ?? 0,
          type: debit != null ? "Debit" : (credit != null ? "Credit" : "Credit"),
        };
      });
    if (!rowsToSave.length) return;

    const saved = await dispatch(saveExtracted(rowsToSave));
    if (saved) {
      setReviewRows([]);
      setIsEditingReview(false);
      setPendingFile(null);
    }
  };

  const categories = useMemo(() =>
    ["All", ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort()],
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((t) => {
      const entryType = getTransactionType(t);
      if (typeFilter !== "All" && entryType !== typeFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      const narration = (t.narration ?? t.description ?? "").toLowerCase();
      const reference = (t.reference ?? "").toLowerCase();
      if (q && !narration.includes(q) && !reference.includes(q)) return false;
      return true;
    });
  }, [entries, search, typeFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const { totalCredits, totalDebits } = useMemo(() => {
    let credits = 0, debits = 0;
    for (const t of filtered) {
      const entryType = getTransactionType(t);
      const credit = t.credit != null && t.credit !== "" ? parseFloat(t.credit) : null;
      const debit = t.debit != null && t.debit !== "" ? parseFloat(t.debit) : null;
      if (entryType === "Credit") credits += credit ?? (parseFloat(t.amount) || 0);
      else debits += debit ?? (parseFloat(t.amount) || 0);
    }
    return { totalCredits: credits, totalDebits: debits };
  }, [filtered]);
  const netFlow = totalCredits - totalDebits;

  const validReviewRows = reviewRows.filter((r) => r.narration || r.description || r.reference || r.debit || r.credit);
  const isReviewing = extracted.length > 0 || reviewRows.length > 0;
  // Show review panel alongside spinner once rows start streaming in
  const showReviewWhileUploading = isUploading && reviewRows.length > 0;

  return (
    <div className="w-full space-y-4">

      {/* ── Upload / Processing / Review Card ── */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              {isReviewing ? "Review Extracted Transactions" : "Import Bank Statement"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {isReviewing
                ? isStreaming
                  ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                      {reviewRows.length} transaction{reviewRows.length !== 1 ? "s" : ""} found so far — fetching more…
                    </span>
                  )
                  : `${reviewRows.length} transaction${reviewRows.length !== 1 ? "s" : ""} extracted — edit if needed, then save`
                : "Upload a bank statement (PDF, XLSX, or CSV) — transactions will be extracted automatically"}
            </p>
          </div>
          {isReviewing && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={handleDiscard} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <X className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                onClick={() => setIsEditingReview((editing) => !editing)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-60"
              >
                {isEditingReview ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                {isEditingReview ? "Done editing" : "Edit data"}
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving || isStreaming || !validReviewRows.length}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? "Saving…" : isStreaming ? "Fetching…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {isUploading ? (
          <>
            <ProcessingCard fileName={pendingFile?.name ?? "Processing…"} stage={uploadStage} liveCount={reviewRows.length} />
            {showReviewWhileUploading && (
              <ReviewTable
                rows={reviewRows}
                isEditing={false}
                onChange={handleRowChange}
                onRemove={handleRemoveRow}
                onAddRow={handleAddRow}
                page={reviewPage}
                pageSize={reviewPageSize}
                onPageChange={setReviewPage}
                onPageSizeChange={setReviewPageSize}
                isStreaming
              />
            )}
          </>
        ) : uploadError ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Extraction Failed</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{uploadError}</p>
            </div>
            <button
              onClick={() => { dispatch(setUploadError(null)); setPendingFile(null); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        ) : isReviewing ? (
          <>
            {statementMeta && (
              <>
                <div className="mb-3 grid grid-cols-1 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Account</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{statementMeta.account_holder || "—"}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{statementMeta.bank_name || "—"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{maskAccountNumber(statementMeta.account_number)}</p>
                    {statementMeta.ifsc && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">IFSC: {statementMeta.ifsc}</p>}
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50/70 p-4 dark:border-red-900/70 dark:bg-red-950/30">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-500">Total Debit</p>
                    <p className="mt-2 text-lg font-semibold text-red-600 dark:text-red-400">{fmt(statementMeta.total_debit ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 dark:border-green-900/70 dark:bg-green-950/30">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500">Total Credit</p>
                    <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-400">{fmt(statementMeta.total_credit ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900/70 dark:bg-sky-950/30">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-500">Closing Balance</p>
                    <p className="mt-2 text-lg font-semibold text-sky-600 dark:text-sky-400">{fmt(statementMeta.closing_balance ?? 0)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{statementMeta.period_from ? `${statementMeta.period_from} → ${statementMeta.period_to}` : "—"}</p>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {statementMeta.average_confidence != null && (
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${statementMeta.average_confidence > 0.85 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400" : statementMeta.average_confidence >= 0.6 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"}`}>
                        <span className="h-2 w-2 rounded-full bg-current" />
                        OCR Confidence {getConfidenceMeta(statementMeta.average_confidence).label}
                      </span>
                    )}
                    {statementMeta.pages != null && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {statementMeta.pages} pages scanned
                      </span>
                    )}
                  </div>
                </div>
                {showDebug && (
                  <pre className="mb-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-[11px] text-slate-200 dark:border-slate-700">
                    {getRawOcrDisplay(debugData)}
                  </pre>
                )}
              </>
            )}
            <div className="mb-3 flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {isEditingReview
                  ? "Editing is enabled. Verify amounts, dates and types before saving."
                  : "Review the parsed data below. Choose Edit data to make corrections before saving."}
              </p>
            </div>
            <ReviewTable
              rows={reviewRows}
              isEditing={isEditingReview}
              onChange={handleRowChange}
              onRemove={handleRemoveRow}
              onAddRow={handleAddRow}
              page={reviewPage}
              pageSize={reviewPageSize}
              onPageChange={setReviewPage}
              onPageSizeChange={setReviewPageSize}
            />
          </>
        ) : (
          <UploadZone onFile={handleFileSelected} disabled={isUploading} />
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={isLoading ? "…" : filtered.length} />
        <StatCard label="Total Credits"  value={isLoading ? "…" : fmt(totalCredits)}  valueClass="text-green-600 dark:text-green-400" />
        <StatCard label="Total Debits"   value={isLoading ? "…" : fmt(totalDebits)}   valueClass="text-red-600 dark:text-red-400" />
        <StatCard label="Net Flow" value={isLoading ? "…" : fmt(netFlow)} valueClass={netFlow >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-red-600 dark:text-red-400"} />
      </div>

      {/* ── Filter Bar ── */}
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Search description, reference…">
        <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <option value="All">All Types</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </FilterSelect>
        <FilterSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
          {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </FilterSelect>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <PenLine className="w-3.5 h-3.5" /> Add Manually
        </button>
        <button
          onClick={() => dispatch(fetchTransactions())}
          className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </TabActionBar>

      {/* ── Saved Transactions Table ── */}
      <TableWrapper>
        <TableHead columns={SAVED_COLS} />
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {isLoading ? (
            <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-slate-500">Loading transactions…</td></tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-14 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
                  <FileText className="w-10 h-10 opacity-30" />
                  <p className="text-sm">
                    {entries.length === 0 ? "No transactions yet — upload a bank statement to get started" : "No transactions match your filters"}
                  </p>
                </div>
              </td>
            </tr>
          ) : paginated.map((row) => {
            const id = row._id?.$oid || row._id || row.id;
            return (
              <SavedRowWrapper
                key={id}
                row={row}
                id={id}
                dispatch={dispatch}
                setDeleteConfirm={setDeleteConfirm}
              />
            );
          })}
        </tbody>
      </TableWrapper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
      />

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Transaction"
          message="This transaction will be permanently deleted. This cannot be undone."
          onConfirm={() => { dispatch(deleteTransaction(deleteConfirm)); setDeleteConfirm(null); }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
      {showAddModal && (
        <AddTransactionModal
          isSaving={isSaving}
          onClose={() => setShowAddModal(false)}
          onSave={async (rows) => {
            const saved = await dispatch(saveExtracted(rows));
            if (saved) setShowAddModal(false);
          }}
        />
      )}
      {pdfPasswordState && (
        <PdfPasswordModal
          isWrongPassword={pdfPasswordState.isWrongPassword}
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      )}
    </div>
  );
}