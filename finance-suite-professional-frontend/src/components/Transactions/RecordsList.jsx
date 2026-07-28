import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { FileText, RefreshCw, Trash2, AlertTriangle, X, PenLine } from "lucide-react";
import { fmt } from "./helpers";
import { useDispatch } from "react-redux";
import { updateRecordStatus, updateRecordNotes } from "../../ReduxApi/transactions";

const STATUS_RECORD = {
  notreviewed: { label: "Not Reviewed", cls: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400" },
  accepted:    { label: "Accepted",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  rejected:    { label: "Rejected",     cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

function RecordStatusBadge({ value }) {
  const m = STATUS_RECORD[value] ?? STATUS_RECORD.notreviewed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function RecordNotesModal({ rec, onSave, onClose }) {
  const [draft, setDraft] = useState(rec.notes ?? "");

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-slate-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Record Notes</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 dark:text-slate-400">
          <p className="font-medium text-gray-700 dark:text-slate-200 truncate">{rec.title}</p>
          <p>{rec.count} transaction{rec.count !== 1 ? "s" : ""}</p>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Notes</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Add notes…"
            autoFocus
            className="w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RecordRow({ rec, onSelect, onDelete, onStatusChange, onNotesChange }) {
  const [confirming, setConfirming] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const handleDelete  = useCallback((e) => { e.stopPropagation(); setConfirming(true); }, []);
  const handleConfirm = useCallback((e) => { e.stopPropagation(); onDelete(rec.id); }, [onDelete, rec.id]);
  const handleCancel  = useCallback((e) => { e.stopPropagation(); setConfirming(false); }, []);

  const handleStatusChange = useCallback((e) => {
    e.stopPropagation();
    onStatusChange(rec.id, e.target.value);
    setChangingStatus(false);
  }, [onStatusChange, rec.id]);

  const createdAt = rec.created_at
    ? new Date(rec.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  if (confirming) {
    return (
      <tr className="bg-red-50 dark:bg-red-950/20">
        <td colSpan={8} className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">
                Delete <span className="font-semibold">{rec.title}</span> and all {rec.count} transaction{rec.count !== 1 ? "s" : ""}?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleConfirm} className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Delete</button>
              <button onClick={handleCancel} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      onClick={() => onSelect({ id: rec.id, title: rec.title })}
      className="group hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate max-w-[200px]">{rec.title || "—"}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {changingStatus ? (
          <select
            autoFocus
            defaultValue={rec.status ?? "notreviewed"}
            onChange={handleStatusChange}
            onBlur={() => setChangingStatus(false)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-0.5 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="notreviewed">Not Reviewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setChangingStatus(true); }} title="Change status">
            <RecordStatusBadge value={rec.status} />
          </button>
        )}
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-slate-400 text-center">
        {rec.count}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-red-600 dark:text-red-400 text-right">
        {fmt(rec.total_debit ?? 0)}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-green-600 dark:text-green-400 text-right">
        {fmt(rec.total_credit ?? 0)}
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-slate-500">
        {createdAt}
      </td>
      <td className="px-5 py-3.5 max-w-[180px]">
        <span className="block text-xs text-gray-500 dark:text-slate-400 truncate" title={rec.notes}>
          {rec.notes || <span className="italic text-gray-300 dark:text-slate-600">No notes</span>}
        </span>
      </td>
      <td className="px-3 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setNotesOpen(true); }}
            className={`p-1.5 rounded transition-colors ${rec.notes ? "text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30" : "text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"}`}
            title="Edit notes"
          >
            <PenLine className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
            title="Delete record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
      {notesOpen && <RecordNotesModal rec={rec} onSave={(notes) => onNotesChange(rec.id, notes)} onClose={() => setNotesOpen(false)} />}
    </tr>
  );
}

export default function RecordsList({ records, isRecordLoading, onSelect, onDelete, onRefresh, onStatusChange, onNotesChange }) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Records</h3>
        <button onClick={onRefresh} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isRecordLoading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {isRecordLoading ? (
        <div className="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-500">Loading records…</div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-14 text-gray-400 dark:text-slate-500">
          <FileText className="w-10 h-10 opacity-30" />
          <p className="text-sm">No records yet — upload a bank statement to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Title</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 text-center">Transactions</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 text-right">Debit</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 text-right">Credit</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Imported</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Notes</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {records.map((rec) => (
                <RecordRow key={rec.id} rec={rec} onSelect={onSelect} onDelete={onDelete} onStatusChange={onStatusChange} onNotesChange={onNotesChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
