import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { FileText, RefreshCw, Trash2, AlertTriangle, X, PenLine } from "lucide-react";
import { fmt } from "./helpers";
import { updateRecordStatus, updateRecordNotes } from "../../ReduxApi/transactions";

function NotesTooltip({ notes, anchorRef }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
  }, [anchorRef]);
  if (!pos) return null;
  return ReactDOM.createPortal(
    <div
      style={{ top: pos.top, left: pos.left, maxWidth: 280 }}
      className="absolute z-[9999] bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none whitespace-pre-wrap break-words"
    >
      {notes}
    </div>,
    document.body
  );
}

function NotesCell({ notes }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  return (
    <span
      ref={ref}
      className="block text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px] cursor-default"
      onMouseEnter={() => notes && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {notes || <span className="italic text-gray-300 dark:text-slate-600">No notes</span>}
      {hovered && <NotesTooltip notes={notes} anchorRef={ref} />}
    </span>
  );
}

const STATUS_RECORD = {
  notreviewed: { label: "Not Reviewed", cls: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400" },
  accepted:    { label: "Accepted",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  rejected:    { label: "Rejected",     cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

function RecordStatusBadge({ value }) {
  const m = STATUS_RECORD[value] ?? STATUS_RECORD.notreviewed;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}

function RecordNotesModal({ rec, onSave, onClose, canWrite = true }) {
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
          <p className="mt-0.5">{rec.count} transaction{rec.count !== 1 ? "s" : ""}</p>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Notes</label>
          {canWrite
            ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="Add notes…" autoFocus className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
            : <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{draft || <span className="italic text-gray-400">No notes</span>}</p>
          }
        </div>
        <div className="flex justify-end gap-2">
          {canWrite
            ? <>
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={() => { onSave(draft); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
              </>
            : <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Close</button>
          }
        </div>
      </div>
    </div>,
    document.body
  );
}

function RecordRow({ rec, onSelect, onDelete, onStatusChange, onNotesChange, canWrite }) {
  const [confirming,     setConfirming]     = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [notesOpen,      setNotesOpen]      = useState(false);

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
        <td colSpan={8} className="px-5 py-3.5">
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
    <>
      <tr
        onClick={() => onSelect({ id: rec.id, title: rec.title })}
        className="hover:bg-gray-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
      >
        {/* Title */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{rec.title || "—"}</span>
          </div>
        </td>

        {/* Status */}
        <td className="px-5 py-3.5">
          {changingStatus ? (
            <select
              autoFocus
              defaultValue={rec.status ?? "notreviewed"}
              onChange={handleStatusChange}
              onBlur={() => setChangingStatus(false)}
              onClick={(e) => e.stopPropagation()}
              className="text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="notreviewed">Not Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              
            </select>
          ) : (
            <button onClick={canWrite ? (e) => { e.stopPropagation(); setChangingStatus(true); } : undefined} title={canWrite ? "Change status" : undefined} className={!canWrite ? "cursor-default" : ""}>
              <RecordStatusBadge value={rec.status} />
            </button>
          )}
        </td>

        {/* Transactions */}
        <td className="px-5 py-3.5 text-center">
          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
            {rec.count ?? 0}
          </span>
        </td>

        {/* Debit */}
        <td className="px-5 py-3.5 text-right tabular-nums">
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(rec.total_debit ?? 0)}</span>
        </td>

        {/* Credit */}
        <td className="px-5 py-3.5 text-right tabular-nums">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(rec.total_credit ?? 0)}</span>
        </td>

        {/* Imported */}
        <td className="px-5 py-3.5 whitespace-nowrap">
          <span className="text-xs text-gray-500 dark:text-slate-400">{createdAt}</span>
        </td>

        {/* Notes */}
        <td className="px-5 py-3.5">
          <NotesCell notes={rec.notes} />
        </td>

        {/* Actions */}
        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {canWrite && (
            <button
              onClick={() => setNotesOpen(true)}
              className={`p-1.5 rounded-md transition-colors ${rec.notes ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" : "text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"}`}
              title="Edit notes"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
            )}
            {canWrite && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            )}
          </div>
        </td>
      </tr>

      {notesOpen && (
        <RecordNotesModal
          rec={rec}
          onSave={(notes) => onNotesChange(rec.id, notes)}
          onClose={() => setNotesOpen(false)}
          canWrite={canWrite}
        />
      )}
    </>
  );
}

export default function RecordsList({ records, isRecordLoading, onSelect, onDelete, onRefresh, onStatusChange, onNotesChange, canWrite = true }) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Records</h3>
          {!isRecordLoading && records.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{records.length} record{records.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <button onClick={onRefresh} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isRecordLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isRecordLoading ? (
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 h-3.5 rounded bg-gray-100 dark:bg-slate-800" />
              <div className="w-20 h-3.5 rounded bg-gray-100 dark:bg-slate-800" />
              <div className="w-16 h-3.5 rounded bg-gray-100 dark:bg-slate-800" />
              <div className="w-24 h-3.5 rounded bg-gray-100 dark:bg-slate-800" />
              <div className="w-24 h-3.5 rounded bg-gray-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-gray-400 dark:text-slate-500">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">No records yet — upload a bank statement to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <colgroup><col className="w-[22%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col /><col className="w-[72px]" /></colgroup>
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Title</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Status</th>
                <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Txns</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Debit</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Credit</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Generated Date</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Notes</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {records.map((rec) => (
                <RecordRow
                  key={rec.id}
                  rec={rec}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onNotesChange={onNotesChange}
                  canWrite={canWrite}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
