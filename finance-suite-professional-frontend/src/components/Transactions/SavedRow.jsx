import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import ReactDOM from "react-dom";
import { Check, X, Edit2, Trash2, FileText } from "lucide-react";
import { updateTransaction, updateTransactionNotes } from "../../ReduxApi/transactions";
import { inputCls, selectCls, TRANSACTION_CATEGORIES, CATEGORY_COLORS, STATUS_META, STATUS_OPTIONS } from "./constants";
import { fmtDate, truncateText, toInputDate, getTransactionType } from "./helpers";
import { InfoCard } from "../../shared/ui";

export const fmt = (n) =>
  "₹ " + Math.abs(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Notes modal ───────────────────────────────────────────────────────────────
function NotesModal({ row, onSave, onClose, canWrite = true }) {
  const [notesDraft,  setNotesDraft]  = useState(row.notes  ?? "");
  const [statusDraft, setStatusDraft] = useState(row.status ?? "pending");
  const backdropDown = useRef(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onMouseDown={(e) => { backdropDown.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (backdropDown.current && e.target === e.currentTarget) onClose(); backdropDown.current = false; }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-slate-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{canWrite ? "Edit Notes & Status" : "Notes & Status"}</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-0.5">
          <p className="font-medium text-gray-700 dark:text-slate-200 truncate">{row.narration ?? row.description ?? "—"}</p>
          <p>{fmtDate(row.date)}{row.reference ? ` · ${row.reference}` : ""}</p>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Status</label>
          {canWrite
            ? <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className={selectCls}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : <p className="text-sm text-gray-700 dark:text-slate-200">{STATUS_OPTIONS.find((o) => o.value === statusDraft)?.label ?? statusDraft}</p>
          }
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Notes</label>
          {canWrite
            ? <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={4} placeholder="Add notes…" className={inputCls + " resize-none"} autoFocus />
            : <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{notesDraft || <span className="italic text-gray-400">No notes</span>}</p>
          }
        </div>
        <div className="flex justify-end gap-2">
          {canWrite
            ? <>
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={() => { onSave(notesDraft, statusDraft); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
              </>
            : <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Close</button>
          }
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Status pill / inline select ───────────────────────────────────────────────
export function StatusCell({ value, editing, onChange, onQuickSave, canWrite = true }) {
  const [open, setOpen] = useState(false);
  const status = value || "pending";
  const m = STATUS_META[status] ?? STATUS_META.pending;
  const opts = STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>);
  if (editing && canWrite) return <select value={status} onChange={(e) => onChange(e.target.value)} className={selectCls + " w-28"}>{opts}</select>;
  if (open && canWrite)    return <select autoFocus value={status} onChange={(e) => { onQuickSave(e.target.value); setOpen(false); }} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} className={selectCls + " w-28"}>{opts}</select>;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${canWrite ? "cursor-pointer" : "cursor-default"} ${m.cls}`} onClick={canWrite ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}>{m.label}</span>;
}

// ── Category pill / inline select ─────────────────────────────────────────────
function CategoryCell({ value, editing, onChange, onQuickSave, canWrite = true }) {
  const [open, setOpen] = useState(false);
  const cat = value || "General";
  const opts = TRANSACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>);
  if (editing && canWrite) return <select value={cat} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Escape" && onChange(cat)} className={selectCls + " w-32"}>{opts}</select>;
  if (open && canWrite)    return <select autoFocus value={cat} onChange={(e) => { onQuickSave(e.target.value); setOpen(false); }} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} className={selectCls + " w-32"}>{opts}</select>;
  return <span onClick={canWrite ? (e) => { e.stopPropagation(); setOpen(true); } : undefined} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.General} ${canWrite ? "cursor-pointer" : "cursor-default"}`}>{cat}</span>;
}

// ── Inline edit input helper ──────────────────────────────────────────────────
function EditInput({ type = "text", value, onChange }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="w-full border border-indigo-300 dark:border-indigo-700 rounded px-2 py-0.5 text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}

// ── Context: each row's live state, keyed by row id ───────────────────────────
export const TxnRowContext = createContext({});

// ── SavedRowWrapper: holds state + registers into context map ─────────────────
export const SavedRowWrapper = React.memo(function SavedRowWrapper({ row, id, dispatch, setDeleteConfirm, onRegister, canWrite = true }) {
  const onSave      = useCallback((d)             => dispatch(updateTransaction(id, d)),                    [dispatch, id]);
  const onDelete    = useCallback(()              => setDeleteConfirm(id),                                  [setDeleteConfirm, id]);
  const onSaveNotes = useCallback((notes, status) => dispatch(updateTransactionNotes(id, notes, status)),   [dispatch, id]);

  const initDraft = useCallback(() => ({
    ...row,
    narration: row.narration ?? row.description ?? "",
    debit:     row.debit   ?? (getTransactionType(row) === "Debit"  ? row.amount ?? "" : ""),
    credit:    row.credit  ?? (getTransactionType(row) === "Credit" ? row.amount ?? "" : ""),
    balance:   row.balance ?? "",
  }), [row]);

  const [editing,   setEditing]   = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft,     setDraft]     = useState(initDraft);

  useEffect(() => { setDraft(initDraft()); }, [row]); // eslint-disable-line

  const resetDraft = useCallback(() => setDraft(initDraft()), [initDraft]);

  // Register into parent map every render so columns always see fresh state
  useEffect(() => {
    onRegister(id, { editing, setEditing, notesOpen, setNotesOpen, draft, setDraft, resetDraft, onSave, onDelete, onSaveNotes, row });
  });

  // Esc cancels row editing
  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => { if (e.key === "Escape") { resetDraft(); setEditing(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, resetDraft]);

  // Render modals that belong to this row
  return notesOpen ? (
    <NotesModal row={row} onSave={onSaveNotes} onClose={() => setNotesOpen(false)} canWrite={canWrite} />
  ) : null;
});

// ── Columns definition (stable — reads live state via stateMap ref) ───────────
export function buildTxnColumns(stateMap, canWrite = true, dispatch = null) {
  const s = (row) => stateMap.current[row._id?.$oid || row._id || row.id];

  return [
    {
      label: "Date",
      render: (row) => {
        const st = s(row);
        return st?.editing
          ? <EditInput type="date" value={toInputDate(st.draft.date)} onChange={(e) => st.setDraft((p) => ({ ...p, date: e.target.value }))} />
          : <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(row.date)}</span>;
      },
    },
    {
      label: "Reference",
      render: (row) => {
        const st = s(row);
        return st?.editing
          ? <EditInput value={st.draft.reference} onChange={(e) => st.setDraft((p) => ({ ...p, reference: e.target.value }))} />
          : <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{(row.reference)}</span>;
      },
    },
    {
      label: "Narration",
      render: (row) => {
        const st = s(row);
        return st?.editing
          ? <EditInput value={st.draft.narration} onChange={(e) => st.setDraft((p) => ({ ...p, narration: e.target.value }))} />
          : <span className="block truncate max-w-60 text-sm font-medium text-gray-800 dark:text-slate-100" title={row.narration ?? row.description}>{row.narration ?? row.description ?? "-"}</span>;
      },
    },
    {
      label: "Debit", right: true,
      render: (row) => {
        const st = s(row);
        if (st?.editing) return <EditInput type="number" value={st.draft.debit} onChange={(e) => st.setDraft((p) => ({ ...p, debit: e.target.value }))} />;
        const v = row.debit != null ? row.debit : (getTransactionType(row) === "Debit" ? row.amount : null);
        return <span className="font-semibold text-xs text-red-600 dark:text-red-400 whitespace-nowrap">{v == null || v === "" ? "—" : fmt(v)}</span>;
      },
    },
    {
      label: "Credit", right: true,
      render: (row) => {
        const st = s(row);
        if (st?.editing) return <EditInput type="number" value={st.draft.credit} onChange={(e) => st.setDraft((p) => ({ ...p, credit: e.target.value }))} />;
        const v = row.credit != null ? row.credit : (getTransactionType(row) === "Credit" ? row.amount : null);
        return <span className="font-semibold text-xs text-green-600 dark:text-green-400 whitespace-nowrap">{v == null || v === "" ? "—" : fmt(v)}</span>;
      },
    },
    {
      label: "Balance", right: true,
      render: (row) => <span className="font-bold text-xs text-gray-700 dark:text-slate-200 whitespace-nowrap">{row.balance != null ? fmt(row.balance) : "-"}</span>,
    },
    // {
    //   label: "Notes",
    //   render: (row) => (
    //     <span className="block text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
    //       {row.notes || <span className="italic text-gray-300 dark:text-slate-600">No notes</span>}
    //     </span>
    //   ),
    // },
    // {
    //   label: "Status", stopPropagation: true,
    //   render: (row) => {
    //     const st = s(row);
    //     return (
    //       <StatusCell
    //         value={st?.editing ? st.draft.status : row.status}
    //         editing={st?.editing}
    //         onChange={(v) => st?.setDraft((p) => ({ ...p, status: v }))}
    //         onQuickSave={(v) => st?.onSaveNotes(row.notes ?? "", v)}
    //       />
    //     );
    //   },
    // },
    {
      label: "Category", stopPropagation: true,
      render: (row) => {
        const st = s(row);
        return (
          <CategoryCell
            value={st?.editing ? st.draft.transaction_category : row.transaction_category}
            editing={st?.editing}
            onChange={(v) => st?.setDraft((p) => ({ ...p, transaction_category: v }))}
            onQuickSave={canWrite && !st?.editing && dispatch ? (v) => {
              const rowId = row._id?.$oid || row._id || row.id;
              dispatch(updateTransaction(rowId, { ...row, transaction_category: v }));
            } : null}
            canWrite={canWrite}
          />
        );
      },
    },
    {
      label: "", right: true, stopPropagation: true,
      render: (row) => {
        const st = s(row);
        return (
          <div className="flex items-center justify-end gap-1">
            {canWrite && st?.editing ? (
              <>
                <button onClick={() => { st.onSave(st.draft); st.setEditing(false); }} className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" title="Save"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { st.resetDraft(); st.setEditing(false); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800" title="Cancel"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <button onClick={(e) => { e.stopPropagation(); st?.setNotesOpen(true); }} className={`p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 ${row.notes ? "text-green-500 dark:text-green-400" : "text-red-400 dark:text-red-500"}`} title="Notes"><FileText className="w-3.5 h-3.5" /></button>
                {canWrite && <button onClick={(e) => { e.stopPropagation(); st?.setEditing(true); }} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                {canWrite && <button onClick={(e) => { e.stopPropagation(); st?.onDelete(); }} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
              </>
            )}
          </div>
        );
      },
    },
  ];
}

// ── renderExpanded — Assets-style InfoCard grid ───────────────────────────────
export function renderTxnExpanded(row, stateMap, canWrite = true) {
  const st = stateMap.current[row._id?.$oid || row._id || row.id];
  const debitVal  = row.debit  != null && row.debit  !== "" ? fmt(row.debit)  : (getTransactionType(row) === "Debit"  && row.amount ? fmt(row.amount)  : "—");
  const creditVal = row.credit != null && row.credit !== "" ? fmt(row.credit) : (getTransactionType(row) === "Credit" && row.amount ? fmt(row.amount) : "—");

  return (
    <div className="p-4 rounded-2xl bg-[#ECEEF2] dark:bg-slate-950">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {/* <InfoCard label="Date"      value={fmtDate(row.date)} /> */}
        {/* <InfoCard label="Reference" value={row.reference || "—"} className="xl:col-span-2" valueClassName="font-mono break-all" /> */}
        <InfoCard label="Narration" value={row.narration ?? row.description ?? "—"} className="xl:col-span-3" valueClassName="whitespace-pre-wrap break-words" />
        {/* <InfoCard label="Debit"     value={debitVal}  valueClassName="text-red-600 dark:text-red-400" /> */}
        {/* <InfoCard label="Credit"    value={creditVal} valueClassName="text-green-600 dark:text-green-400" /> */}
        {/* <InfoCard label="Balance"   value={row.balance != null ? fmt(row.balance) : "—"} /> */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</p>
          <div className="mt-2">
            <StatusCell
              value={st?.editing ? st.draft.status : row.status}
              editing={canWrite && st?.editing}
              onChange={(v) => st?.setDraft((p) => ({ ...p, status: v }))}
              onQuickSave={canWrite ? (v) => st?.onSaveNotes(row.notes ?? "", v) : () => {}}
              canWrite={canWrite}
            />
          </div>
        </div>
        {/* <InfoCard label="Category" value={row.transaction_category || "General"} /> */}
        <InfoCard label="Notes"    value={row.notes || "—"} className="xl:col-span-4" valueClassName="whitespace-pre-wrap break-words" />
      </div>
    </div>
  );
}
