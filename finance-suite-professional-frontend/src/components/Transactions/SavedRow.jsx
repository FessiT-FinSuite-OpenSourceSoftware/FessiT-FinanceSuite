import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Check, X, Edit2, Trash2, PenLine, FileText } from "lucide-react";
import { updateTransaction, updateTransactionNotes, deleteTransaction } from "../../ReduxApi/transactions";
import { inputCls, selectCls } from "./constants";
import { fmtDate, truncateText, toInputDate, getTransactionType } from "./helpers";
import StatusBadge from "./StatusBadge";

const fmt = (n) =>
  "₹ " + Math.abs(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function NotesModal({ row, onSave, onClose }) {
  const [notesDraft,  setNotesDraft]  = useState(row.notes  ?? "");
  const [statusDraft, setStatusDraft] = useState(row.status ?? "pending");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-slate-700 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Edit Notes &amp; Status</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction summary */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-0.5">
          <p className="font-medium text-gray-700 dark:text-slate-200 truncate">{row.narration ?? row.description ?? "—"}</p>
          <p>{fmtDate(row.date)}{row.reference ? ` · ${row.reference}` : ""}</p>
        </div>

        {/* Status */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Status</label>
          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            className={selectCls}
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="reconciled">Reconciled</option>
          </select>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Notes</label>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={4}
            placeholder="Add notes…"
            className={inputCls + " resize-none"}
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(notesDraft, statusDraft); onClose(); }}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const SavedRow = React.memo(function SavedRow({ row, onSave, onDelete, onSaveNotes }) {
  const [editing,    setEditing]    = useState(false);
  const [notesOpen,  setNotesOpen]  = useState(false);
  const [draft, setDraft] = useState(() => ({
    ...row,
    narration: row.narration ?? row.description ?? "",
    debit:     row.debit   ?? (getTransactionType(row) === "Debit"  ? row.amount ?? "" : ""),
    credit:    row.credit  ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
    balance:   row.balance ?? "",
  }));

  useEffect(() => {
    setDraft({
      ...row,
      narration: row.narration ?? row.description ?? "",
      debit:     row.debit   ?? (getTransactionType(row) === "Debit"  ? row.amount ?? "" : ""),
      credit:    row.credit  ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
      balance:   row.balance ?? "",
    });
  }, [row]);

  const resetDraft = useCallback(() => setDraft({
    ...row,
    narration: row.narration ?? row.description ?? "",
    debit:     row.debit   ?? (getTransactionType(row) === "Debit"  ? row.amount ?? "" : ""),
    credit:    row.credit  ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
    balance:   row.balance ?? "",
  }), [row]);

  const f = (key, type = "text") => (
    <input
      type={type}
      value={type === "date" ? toInputDate(draft[key]) : (draft[key] ?? "")}
      onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
      onClick={(e) => e.stopPropagation()}
      className="w-full border border-indigo-300 dark:border-indigo-700 rounded px-2 py-0.5 text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );

  const debitValue  = row.debit  != null ? row.debit  : (getTransactionType(row) === "Debit"  ? row.amount : null);
  const creditValue = row.credit != null ? row.credit : (getTransactionType(row) === "Credit" ? row.amount : null);

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
        <td className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
          {editing ? f("date", "date") : fmtDate(row.date)}
        </td>
        <td className="px-4 py-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap min-w-[140px]">
          {editing ? f("reference") : truncateText(row.reference, 16)}
        </td>
        <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-slate-100 max-w-60">
          {editing ? f("narration") : <span className="block truncate" title={row.narration ?? row.description}>{row.narration ?? row.description ?? "-"}</span>}
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <StatusBadge value={row.status} />
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
        <td className="px-4 py-2 min-w-[180px]">
          <span className="block text-xs text-gray-500 dark:text-slate-400 truncate max-w-[180px]" title={row.notes}>
            {row.notes || <span className="italic text-gray-300 dark:text-slate-600">No notes</span>}
          </span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            {editing ? (
              <>
                <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" title="Save"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { resetDraft(); setEditing(false); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800" title="Cancel"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <button onClick={() => setNotesOpen(true)} className={`p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 ${row.notes ? "text-green-500 dark:text-green-400" : "text-red-400 dark:text-red-500"}`} title="Edit notes"><FileText  className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={onDelete} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        </td>
      </tr>

      {notesOpen && (
        <NotesModal
          row={row}
          onSave={onSaveNotes}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </>
  );
});

export const SavedRowWrapper = React.memo(function SavedRowWrapper({ row, id, dispatch, setDeleteConfirm }) {
  const onSave      = useCallback((draft) => dispatch(updateTransaction(id, draft)),           [dispatch, id]);
  const onDelete    = useCallback(() => setDeleteConfirm(id),                                  [setDeleteConfirm, id]);
  const onSaveNotes = useCallback((notes, status) => dispatch(updateTransactionNotes(id, notes, status)), [dispatch, id]);
  return <SavedRow row={row} onSave={onSave} onDelete={onDelete} onSaveNotes={onSaveNotes} />;
});
