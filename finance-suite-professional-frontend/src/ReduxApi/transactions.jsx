import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { KeyUri } from "../shared/key";
import { toast } from "react-toastify";

const MAX_STATEMENT_SIZE = 20 * 1024 * 1024;
const SUPPORTED_STATEMENT_EXTENSIONS = new Set([
  "pdf", "xlsx", "xls", "csv", "png", "jpg", "jpeg", "tiff", "tif", "bmp", "webp",
]);

// ── Response normaliser ───────────────────────────────────────────────────────
// API returns debit/credit as separate nullable floats — keep them as-is.
function normaliseTransaction(t) {
  return {
    id:        t._id?.$oid ?? t._id ?? t.id ?? "",
    _id:       t._id,
    date:      normaliseDate(t.date ?? ""),
    narration: (t.narration ?? t.description ?? "").trim(),
    reference: t.reference ?? t.ref_no ?? t.cheque_no ?? "",
    category:  t.category ?? "",
    debit:     t.debit  != null ? parseFloat(t.debit)  : null,
    credit:    t.credit != null ? parseFloat(t.credit) : null,
    balance:   t.balance != null ? parseFloat(t.balance) : null,
    title:     t.title  ?? "",
    status:    t.status ?? "pending",
    transaction_category: t.transaction_category ?? "General",
    notes:     t.notes  ?? "",
  };
}

/**
 * Parse the /ocr/bank-statement response.
 * When 1 file: { success, statements: { filename, success, statement: { transactions, ...meta } } }
 * When N files: { success, statements: [ { filename, success, statement: {...} }, ... ] }
 */
function extractFromResponse(data) {
  const raw = data?.statements;
  if (!raw) return { transactions: [], meta: null };

  const entry = Array.isArray(raw) ? raw[0] : raw;

  if (!entry?.success) {
    throw new Error(entry?.message || "OCR service could not parse the file");
  }

  const stmt = entry.statement ?? {};
  const transactions = (stmt.transactions ?? []).map(normaliseTransaction);

  const meta = {
    filename:           entry.filename            ?? null,
    bank_name:          stmt.bank_name            ?? null,
    account_holder:     stmt.account_holder       ?? null,
    account_number:     stmt.account_number       ?? null,
    ifsc:               stmt.ifsc                 ?? null,
    period_from:        stmt.period_from          ?? null,
    period_to:          stmt.period_to            ?? null,
    total_debit:        stmt.total_debit          ?? 0,
    total_credit:       stmt.total_credit         ?? 0,
    closing_balance:    stmt.closing_balance      ?? null,
    total_transactions: stmt.total_transactions   ?? transactions.length,
    average_confidence: entry.average_confidence  ?? null,
    pages:              entry.pages               ?? null,
  };

  return { transactions, meta };
}

// dd/mm/yyyy or dd-mm-yyyy → yyyy-mm-dd for <input type="date">
function normaliseDate(raw) {
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return raw;
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function errMsg(err, fallback) {
  return (
    err?.response?.data?.detail  ||
    err?.response?.data?.message ||
    err?.response?.data?.error   ||
    err?.message                 ||
    fallback
  );
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    isLoading:     false,
    isRecordLoading: false,
    isSaving:      false,
    isUploading:   false,
    isStreaming:   false,
    uploadStage:   null,
    uploadError:   null,
    entries:       [],
    records:       [],
    total:         0,
    totals:        null,
    extracted:     [],
    statementMeta: null,
    debtStats:     null, // { debt_taken, debt_repaid, net_debt }
  },
  reducers: {
    setLoading:        (s, { payload }) => { s.isLoading        = payload; },
    setRecordLoading:  (s, { payload }) => { s.isRecordLoading  = payload; },
    setSaving:         (s, { payload }) => { s.isSaving         = payload; },
    setUploading:   (s, { payload }) => {
      s.isUploading = payload;
      if (payload) s.uploadError = null;
      if (!payload) { s.uploadStage = null; s.isStreaming = false; }
    },
    setUploadStage: (s, { payload }) => { s.uploadStage = payload; },
    setUploadError: (s, { payload }) => { s.isUploading = false; s.isStreaming = false; s.uploadStage = null; s.uploadError = payload; },
    setStreaming:   (s, { payload }) => { s.isStreaming = payload; },
    setRecords:     (s, { payload }) => { s.records = payload; },
    setEntries:     (s, { payload }) => {
      const arr = Array.isArray(payload) ? payload : (payload.data ?? payload.transactions ?? []);
      s.entries = arr;
      s.total   = payload.total ?? arr.length;
      s.totals  = payload.totals ?? null;
    },
    setExtracted:   (s, { payload }) => {
      s.isUploading = false;
      s.uploadError = null;
      if (payload.transactions !== null) s.extracted = payload.transactions;
      s.statementMeta = { ...(s.statementMeta ?? {}), ...payload.meta };
      if (payload.streamingDone) s.isStreaming = false;
    },
    appendTransactions: (s, { payload }) => {
      s.extracted = [...s.extracted, ...payload];
    },
    clearExtracted: (s) => { s.extracted = []; s.statementMeta = null; s.uploadError = null; s.isStreaming = false; },
    upsertEntry:    (s, { payload }) => {
      const id  = payload._id?.$oid ?? payload._id ?? payload.id;
      const idx = s.entries.findIndex((e) => (e._id?.$oid ?? e._id ?? e.id) === id);
      if (idx >= 0) s.entries[idx] = { ...s.entries[idx], ...payload }; else s.entries.unshift(payload);
      s.total = s.entries.length;
    },
    patchEntry: (s, { payload: { id, changes } }) => {
      const idx = s.entries.findIndex((e) => (e._id?.$oid ?? e._id ?? e.id) === id);
      if (idx >= 0) s.entries[idx] = { ...s.entries[idx], ...changes };
    },
    removeEntry:    (s, { payload }) => {
      s.entries = s.entries.filter((e) => (e._id?.$oid ?? e._id ?? e.id) !== payload);
      s.total   = s.entries.length;
    },
    setDebtStats:   (s, { payload }) => { s.debtStats = payload; },
  },
});

export const {
  setLoading, setRecordLoading, setSaving, setUploading, setUploadStage, setUploadError,
  setEntries, setRecords, setExtracted, appendTransactions, clearExtracted, setStreaming,
  upsertEntry, patchEntry, removeEntry, setDebtStats,
} = transactionsSlice.actions;

export const transactionsSelector = (s) => s.transactions;
export default transactionsSlice.reducer;

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchRecords = () => async (dispatch) => {
  dispatch(setRecordLoading(true));
  try {
    const { data } = await axiosInstance.get("/transactions/records");
    dispatch(setRecords(data));
  } catch (err) {
    toast.error(errMsg(err, "Failed to fetch records"));
  } finally {
    dispatch(setRecordLoading(false));
  }
};

export const fetchByRecord = (recordId, params = {}) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await axiosInstance.get(`/transactions/by-record/${recordId}`, { params });
    dispatch(setEntries(data));
  } catch (err) {
    toast.error(errMsg(err, "Failed to fetch transactions"));
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchTransactions = (params = {}) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const { data } = await axiosInstance.get("/transactions", { params });
    dispatch(setEntries(data));
  } catch (err) {
    toast.error(errMsg(err, "Failed to fetch transactions"));
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Upload to POST /ocr/bank-statement/stream
 * Streams NDJSON — meta arrives first, then transaction batches page-by-page.
 *
 * @param {File}        file
 * @param {string|null} password  - PDF password (null = first attempt without one)
 * @returns {number|null|"password_required"|"invalid_password"}
 *   Returns transaction count on success, a password error string if the backend
 *   needs a password or the password was wrong, or null on other failures.
 */
export const uploadStatement = (file, password = null) => async (dispatch) => {
  const extension = file?.name?.split(".").pop()?.toLowerCase();
  if (!file || !SUPPORTED_STATEMENT_EXTENSIONS.has(extension)) {
    const msg = "Unsupported statement format. Upload a PDF or supported image file.";
    dispatch(setUploadError(msg));
    toast.warning(msg);
    return null;
  }
  if (file.size > MAX_STATEMENT_SIZE) {
    const msg = "The selected statement exceeds the 20 MB upload limit.";
    dispatch(setUploadError(msg));
    toast.warning(msg);
    return null;
  }

  dispatch(setUploading(true));
  dispatch(setUploadStage("uploading"));

  const form = new FormData();
  form.append("file", file);
  // Never log the password — only append it to the form, never to any string.
  if (password) form.append("password", password);

  let totalTransactions = 0;

  try {
    const response = await fetch(`${KeyUri.BACKENDURI}/ocr/bank-statement/stream`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      let detail;
      try { detail = JSON.parse(text)?.detail; } catch { detail = text; }
      // Surface password errors back to the caller without dispatching an error
      // so the UI can prompt and retry without showing the generic error state.
      if (response.status === 401 && detail?.error_type) {
        return detail.error_type; // "password_required" | "invalid_password"
      }
      const msg = typeof detail === "string" ? detail : detail?.message ?? text;
      throw Object.assign(new Error(msg), { status: response.status });
    }

    dispatch(setUploadStage("extracting"));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk;
        try { chunk = JSON.parse(line); } catch { continue; }

        if (chunk.type === "meta") {
          dispatch(setExtracted({ transactions: [], meta: chunk.data }));
          dispatch(setUploadStage("parsing"));
          dispatch(setStreaming(true));
        } else if (chunk.type === "transactions") {
          const normalised = chunk.data.map(normaliseTransaction);
          dispatch(appendTransactions(normalised));
          totalTransactions += normalised.length;
        } else if (chunk.type === "summary") {
          dispatch(setExtracted({
            transactions: null,
            meta: chunk.data,
            streamingDone: true,
          }));
        } else if (chunk.type === "error") {
          throw new Error(chunk.data?.message ?? "Streaming extraction failed");
        }
      }
    }

    if (!totalTransactions) {
      const msg = "No transactions could be extracted. Check the document quality and try again.";
      dispatch(setUploadError(msg));
      toast.warning(msg);
      return null;
    }

    toast.success(`Extracted ${totalTransactions} transaction${totalTransactions !== 1 ? "s" : ""} — review and save`);
    return totalTransactions;

  } catch (err) {
    const msg =
      err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")
        ? "Statement upload failed. Make sure the backend is running."
        : err?.status === 400
        ? err.message || "Invalid file. Check format or size (max 20 MB)."
        : err?.status === 422
        ? "The file could not be parsed. Please check the document and try again."
        : err?.message || "Failed to parse bank statement";
    dispatch(setUploadError(msg));
    toast.error(msg);
    return null;
  } finally {
    dispatch(setUploading(false));
  }
};

export const saveExtracted = (rows, title = "") => async (dispatch) => {
  dispatch(setSaving(true));
  try {
    await axiosInstance.post("/transactions/save", { transactions: rows, title });
    toast.success(`Saved ${rows.length} transaction${rows.length !== 1 ? "s" : ""}`);
    dispatch(clearExtracted());
    dispatch(fetchRecords());
    return true;
  } catch (err) {
    toast.error(errMsg(err, "Failed to save transactions"));
    return false;
  } finally {
    dispatch(setSaving(false));
  }
};

export const updateTransactionNotes = (id, notes, status) => async (dispatch) => {
  try {
    const { data } = await axiosInstance.patch(`/transactions/${id}/notes`, { notes, status });
    dispatch(upsertEntry(data));
    toast.success("Notes saved");
  } catch (err) {
    toast.error(errMsg(err, "Failed to save notes"));
  }
};

export const updateTransaction = (id, payload) => async (dispatch) => {
  dispatch(patchEntry({ id, changes: { transaction_category: payload.transaction_category, narration: payload.narration, reference: payload.reference, date: payload.date, debit: payload.debit, credit: payload.credit, balance: payload.balance } }));
  try {
    const { data } = await axiosInstance.put(`/transactions/${id}`, payload);
    dispatch(upsertEntry(data.transaction ?? data));
    toast.success("Transaction updated");
  } catch (err) {
    toast.error(errMsg(err, "Failed to update transaction"));
  }
};

export const deleteTransaction = (id) => async (dispatch) => {
  try {
    await axiosInstance.delete(`/transactions/${id}`);
    dispatch(removeEntry(id));
    toast.success("Transaction deleted");
  } catch (err) {
    toast.error(errMsg(err, "Failed to delete transaction"));
  }
};

export const deleteRecord = (recordId) => async (dispatch) => {
  try {
    const { data } = await axiosInstance.delete(`/transactions/records/${recordId}`);
    dispatch(fetchRecords());
    toast.success(`Deleted ${data.deleted} transaction${data.deleted !== 1 ? "s" : ""}`);
    return true;
  } catch (err) {
    toast.error(errMsg(err, "Failed to delete record"));
    return false;
  }
};

export const updateRecordNotes = (recordId, notes) => async (dispatch) => {
  try {
    await axiosInstance.patch(`/transactions/records/${recordId}/notes`, { notes });
    dispatch(fetchRecords());
  } catch (err) {
    toast.error(errMsg(err, "Failed to update record notes"));
  }
};

export const updateRecordStatus = (recordId, status) => async (dispatch) => {
  try {
    await axiosInstance.patch(`/transactions/records/${recordId}/status`, { status });
    dispatch(fetchRecords());
  } catch (err) {
    toast.error(errMsg(err, "Failed to update record status"));
  }
};
