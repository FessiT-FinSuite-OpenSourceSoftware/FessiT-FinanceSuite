import React, { useState } from "react";
import { X, Plus, RefreshCw } from "lucide-react";
import { Pagination } from "../../shared/ui";
import { inputCls } from "./constants";
import { fmtDate, truncateText, toInputDate } from "./helpers";

function NarrationCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <span className="text-gray-500 dark:text-slate-400">—</span>;
  return (
    <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full text-left">
      <span className={`block ${expanded ? "whitespace-normal" : "truncate"}`} title={value}>{value}</span>
    </button>
  );
}

const fmt = (n) =>
  "₹ " + Math.abs(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReviewTable({ rows, isEditing, onChange, onRemove, onAddRow, page = 1, pageSize = 10, onPageChange, onPageSizeChange, isStreaming = false }) {
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
                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
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
                    {isEditing
                      ? <input type="date" value={toInputDate(row.date)} onChange={(e) => onChange(i_abs, "date", e.target.value)} className={inputCls} />
                      : <span className="text-gray-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(row.date)}</span>}
                  </td>
                  <td className="px-2 py-1.5 min-w-[140px]">
                    {isEditing
                      ? <input type="text" value={row.reference ?? ""} onChange={(e) => onChange(i_abs, "reference", e.target.value)} className={inputCls} placeholder="Reference" />
                      : <span className="block max-w-[140px] truncate font-mono text-indigo-600 dark:text-indigo-400" title={row.reference || undefined}>{truncateText(row.reference, 16)}</span>}
                  </td>
                  <td className="px-2 py-1.5 min-w-[220px]">
                    {isEditing
                      ? <input type="text" value={row.narration ?? row.description ?? ""} onChange={(e) => onChange(i_abs, "narration", e.target.value)} className={inputCls} placeholder="Narration" />
                      : <NarrationCell value={row.narration ?? row.description} />}
                  </td>
                  <td className="px-2 py-1.5 min-w-[110px]">
                    {isEditing
                      ? <input type="number" step="0.01" value={row.debit ?? ""} onChange={(e) => onChange(i_abs, "debit", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                      : <span className="block text-right font-semibold text-red-600 dark:text-red-400">{row.debit == null || row.debit === "" ? "—" : fmt(row.debit)}</span>}
                  </td>
                  <td className="px-2 py-1.5 min-w-[110px]">
                    {isEditing
                      ? <input type="number" step="0.01" value={row.credit ?? ""} onChange={(e) => onChange(i_abs, "credit", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                      : <span className="block text-right font-semibold text-green-600 dark:text-green-400">{row.credit == null || row.credit === "" ? "—" : fmt(row.credit)}</span>}
                  </td>
                  <td className="px-2 py-1.5 min-w-[110px]">
                    {isEditing
                      ? <input type="number" step="0.01" value={row.balance ?? ""} onChange={(e) => onChange(i_abs, "balance", e.target.value === "" ? null : e.target.value)} className={inputCls + " text-right"} placeholder="0.00" />
                      : <span className="block text-right font-semibold text-gray-700 dark:text-slate-200">{row.balance == null || row.balance === "" ? "—" : fmt(row.balance)}</span>}
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
