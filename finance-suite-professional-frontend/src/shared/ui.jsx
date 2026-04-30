import React from "react";
import ReactDOM from "react-dom";
import { Search, Filter, Edit2, Trash2, X } from "lucide-react";

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, valueClass = "text-gray-900" }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

// ── Tab Action Bar ────────────────────────────────────────────────────────────
// children = filter selects + action buttons on the right side
export function TabActionBar({ searchValue, onSearchChange, searchPlaceholder = "Search...", children }) {
  return (
    <div className="sticky top-[88px] z-10 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg text-sm"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Filter Select ─────────────────────────────────────────────────────────────
export function FilterSelect({ value, onChange, children }) {
  return (
    <select
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

// ── Create Button ─────────────────────────────────────────────────────────────
export function CreateButton({ onClick, label = "Create", icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}

// ── Table Wrapper ─────────────────────────────────────────────────────────────
export function TableWrapper({ children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

// ── Table Head ────────────────────────────────────────────────────────────────
export function TableHead({ columns }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {columns.map((col) => (
          <th
            key={col.label}
            className={`px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider${col.right ? " text-right" : " text-left"}${col.hidden ? " hidden lg:table-cell" : ""}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ── Empty Row ─────────────────────────────────────────────────────────────────
export function EmptyRow({ colSpan, message = "No records found." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-500">
        {message}
      </td>
    </tr>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status, colorFn }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorFn(status)}`}>
      {status}
    </span>
  );
}

// ── Edit / Delete Actions ─────────────────────────────────────────────────────
export function RowActions({ onEdit, onDelete, canEdit = true, canDelete = true }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={onEdit}
        disabled={!canEdit}
        className={`transition-colors ${canEdit ? "text-gray-600 hover:text-green-600" : "text-gray-300 cursor-not-allowed"}`}
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className={`transition-colors ${canDelete ? "text-gray-600 hover:text-red-600" : "text-gray-300 cursor-not-allowed"}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, onSave, saveLabel = "Save", children }) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-[2px] overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl ring-1 ring-black/10 p-6 w-full max-w-lg relative max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">{children}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saveLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Form Field ────────────────────────────────────────────────────────────────
export function FormField({ label, children, colSpan = false }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Truncated cell text ──────────────────────────────────────────────────────
export function TruncatedCell({ text, maxWidth = "max-w-[180px]", className = "" }) {
  return (
    <span
      className={`block truncate ${maxWidth} ${className}`}
      title={text || ""}
    >
      {text || "-"}
    </span>
  );
}

// ── Shared input class ────────────────────────────────────────────────────────
export const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm";

// ── Pagination Bar ────────────────────────────────────────────────────────────
export function Pagination({ currentPage, totalPages, pageSize, totalCount, onPageChange, onPageSizeChange }) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, totalCount);

  // Build page numbers with ellipsis for large page counts
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 mt-0 rounded-b-lg">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Rows per page:</span>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-gray-400">|</span>
        <span>{totalCount === 0 ? "0" : `${start}–${end}`} of {totalCount}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        {getPages().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
