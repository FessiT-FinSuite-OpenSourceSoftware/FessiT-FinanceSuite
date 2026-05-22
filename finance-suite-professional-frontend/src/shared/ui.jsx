import React from "react";
import ReactDOM from "react-dom";
import { Search, Filter, Edit2, Trash2, X, ChevronDown } from "lucide-react";

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
export function TabActionBar({ searchValue, onSearchChange, searchPlaceholder = "Search...", sticky = true, children }) {
  return (
    <div className={`${sticky ? "sticky top-[88px] z-10 " : ""}rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-2`}>
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
export function TableWrapper({ children, className }) {
  return (
    <div className={className || "bg-white rounded-lg shadow-sm overflow-hidden"}>
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
            className={`px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider${col.right ? " text-right" : col.center ? " text-center" : " text-left"}${col.hidden ? " hidden lg:table-cell" : ""}`}
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
const MODAL_SIZE = { sm: "max-w-lg", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-5xl" };

export function Modal({ title, onClose, onSave, saveLabel = "Save", size = "sm", children }) {
  React.useEffect(() => {
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, []);
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-[2px] overflow-y-auto p-4">
      <div className={`bg-white rounded-xl shadow-2xl ring-1 ring-black/10 p-6 w-full ${MODAL_SIZE[size] || MODAL_SIZE.sm} relative max-h-[calc(100vh-2rem)] overflow-y-auto`}>
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

// ── Confirm Delete Modal ─────────────────────────────────────────────────────
export function ConfirmModal({ title = "Confirm Delete", message, onConfirm, onClose, confirmLabel = "Delete", confirmClass = "bg-red-600 hover:bg-red-700" }) {
  React.useEffect(() => {
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, []);
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-96">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Info Card (expandable row detail) ────────────────────────────────────────
export function InfoCard({ label, value, className = "", valueClassName = "" }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-slate-800 ${valueClassName}`}>{value || "-"}</p>
    </div>
  );
}

// ── Form Field (input) ────────────────────────────────────────────────────────
export function Field({ label, name, value, onChange, placeholder, type = "text", readOnly = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 ${
          readOnly ? "cursor-not-allowed bg-slate-100 text-slate-500 focus:ring-0" : ""
        }`}
      />
    </div>
  );
}

// ── Data Table ───────────────────────────────────────────────────────────────
export function DataTable({ columns, data, isLoading, rowKey, renderExpanded, wrapperClass, tbodyClass = "divide-y divide-gray-200", emptyMessage }) {
  const [openId, setOpenId] = React.useState(null);
  const expandable = typeof renderExpanded === "function";
  return (
    <TableWrapper className={wrapperClass}>
      <TableHead columns={columns} />
      <tbody className={tbodyClass}>
        {isLoading ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-8">
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    {columns.map((col) => (
                      <div key={col.label} className={`skeleton-shimmer h-4 rounded ${col.right ? "ml-auto w-16" : "flex-1"}`} />
                    ))}
                  </div>
                ))}
              </div>
            </td>
          </tr>
        ) : !data?.length ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-14 text-center">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6M3 17h18" />
                </svg>
                <p className="text-sm">{emptyMessage || "No records found."}</p>
              </div>
            </td>
          </tr>
        ) : data.map((row) => {
          const key = rowKey(row);
          const isOpen = expandable && openId === key;
          return (
            <React.Fragment key={key}>
              <tr
                className={`hover:bg-gray-50 transition-colors${expandable ? " cursor-pointer" : ""}`}
                onClick={expandable ? () => setOpenId(isOpen ? null : key) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.label}
                    className={`px-4 py-2 whitespace-nowrap${col.right ? " text-right" : col.center ? " text-center" : ""}${col.hidden ? " hidden lg:table-cell" : ""} text-sm`}
                    onClick={col.stopPropagation ? (e) => e.stopPropagation() : undefined}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
              {isOpen && (
                <tr className="bg-slate-50 border-t border-slate-100">
                  <td colSpan={columns.length}>{renderExpanded(row)}</td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </TableWrapper>
  );
}

// ── TDS Section Select ───────────────────────────────────────────────────────
// Single input field — typing searches, blurring closes, selecting fills the input
export function TdsSectionSelect({ value, onChange, inputCls: cls }) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const fieldCls = cls || "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400";

  const [list, setList] = React.useState([]);
  React.useEffect(() => {
    import("../utils/tdsData").then((m) => setList(m.TDS_FLAT_LIST || []));
  }, []);

  const selected = list.find((s) => s.code === value);
  const q = search.toLowerCase();
  const filtered = q
    ? list.filter(
        (s) =>
          s.newSection.toLowerCase().includes(q) ||
          s.oldSection.toLowerCase().includes(q) ||
          s.nature.toLowerCase().includes(q) ||
          s.rate.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q)
      )
    : list;

  const displayText = selected
    ? `${selected.newSection} (${selected.oldSection}) — ${selected.nature} (${selected.rate})`
    : "";

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          className={`${fieldCls} pr-8`}
          placeholder="Search TDS section by code, section, nature or rate..."
          value={open ? search : displayText}
          onFocus={() => { setOpen(true); setSearch(""); }}
          onBlur={() => setTimeout(() => { setOpen(false); setSearch(""); }, 150)}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-xl mt-1">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} section{filtered.length !== 1 ? "s" : ""} found</span>
            {selected && <span className="text-xs text-blue-600 font-medium">{selected.newSection} selected</span>}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No matching section found</div>
            ) : filtered.map((s) => (
              <div
                key={s.code}
                onMouseDown={() => { onChange(s.code, s.rateNum, s); setOpen(false); setSearch(""); }}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0 ${
                  s.code === value ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden">
                                   <span className="font-mono text-xs text-gray-400 shrink-0">{s.code}</span>

                  <span className="font-semibold text-blue-700 text-xs shrink-0">{s.newSection}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{s.oldSection}</span>
                  <span className="text-xs text-gray-600 truncate flex-1">{s.nature}</span>
                  <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded ${
                    s.slab ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-700"
                  }`}>
                    {s.rate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Combo Field (select with Other → inline editable input) ─────────────────
export function ComboField({ name, value, onChange, options, placeholder, otherLabel = "Other..." }) {
  const isCustom = value !== "" && !options.includes(value);
  if (isCustom) {
    return (
      <div className="relative">
        <input
          autoFocus
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          className={inputCls}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onChange({ target: { name, value: "" } })}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    );
  }
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => {
        if (e.target.value === "__other__") onChange({ target: { name, value: " " } });
        else onChange(e);
      }}
      className={inputCls}
    >
      <option value="">Select...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__other__">{otherLabel}</option>
    </select>
  );
}

// ── Unit Select ─────────────────────────────────────────────────────────────
const UNIT_GROUPS = [
  { label: "Count",      units: ["Pcs", "Nos", "Units", "Dozen", "Gross"] },
  { label: "Weight",     units: ["Kg", "Grams", "Tonnes"] },
  { label: "Volume",     units: ["Liters", "ML", "Cubic Meters"] },
  { label: "Length",     units: ["Meters", "CM", "MM", "Feet", "Inches"] },
  { label: "Area",       units: ["Sq. Meters", "Sq. Feet"] },
  { label: "Packaging",  units: ["Boxes", "Cartons", "Bags", "Bundles", "Rolls", "Pairs", "Sets"] },
  { label: "Time",       units: ["Hours", "Days"] },
  { label: "Other",      units: ["Others"] },
];
const ALL_UNITS = UNIT_GROUPS.flatMap((g) => g.units);

export function UnitSelect({ value, onChange }) {
  const [open, setOpen]     = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [customInput, setCustomInput] = React.useState(false);
  const [customVal, setCustomVal]     = React.useState("");
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // If current value is not in any group, it's a custom value
  const isCustom = value && !UNIT_GROUPS.flatMap(g => g.units).includes(value);

  React.useEffect(() => {
    if (isCustom) { setCustomInput(true); setCustomVal(value); }
  }, []);

  const q = search.toLowerCase();
  const filtered = q
    ? UNIT_GROUPS.map((g) => ({ ...g, units: g.units.filter((u) => u.toLowerCase().includes(q)) })).filter((g) => g.units.length > 0)
    : UNIT_GROUPS;

  const handleSelect = (u) => {
    if (u === "Others") {
      setCustomInput(true);
      setCustomVal("");
      onChange("");
      setOpen(false);
      setSearch("");
    } else {
      setCustomInput(false);
      onChange(u);
      setOpen(false);
      setSearch("");
    }
  };

  if (customInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={customVal}
          onChange={(e) => { setCustomVal(e.target.value); onChange(e.target.value); }}
          placeholder="Type unit..."
          className="w-20 border border-blue-400 ring-2 ring-blue-100 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none"
        />
        <button
          type="button"
          title="Pick from list"
          onClick={() => { setCustomInput(false); setCustomVal(""); onChange(""); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setSearch(""); }}
        className={`w-full flex items-center justify-between gap-1 border rounded px-2 py-1 text-sm transition-all ${
          open ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-300 hover:border-gray-400"
        } bg-white text-gray-700`}
      >
        <span className={value ? "text-gray-800 font-medium" : "text-gray-400"}>
          {value || "Unit"}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search unit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              />
            </div>
          </div>

          {/* Clear option */}
          {value && (
            <div
              onMouseDown={() => { onChange(""); setOpen(false); }}
              className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 cursor-pointer border-b border-gray-100 flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> Clear selection
            </div>
          )}

          {/* Grouped list */}
          <div className="max-h-56 overflow-y-auto overscroll-contain"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No units found</p>
            ) : filtered.map((group) => (
              <div key={group.label}>
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.label}</p>
                {group.units.map((u) => (
                  <div
                    key={u}
                    onMouseDown={() => handleSelect(u)}
                    className={`mx-1.5 mb-0.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      value === u
                        ? "bg-blue-600 text-white font-semibold"
                        : u === "Others"
                        ? "text-indigo-600 font-medium hover:bg-indigo-50"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <span>{u === "Others" ? " Others (type custom)" : u}</span>
                    {value === u && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pagination Bar ────────────────────────────────────────────────────────────
export function Pagination({ currentPage, totalPages, pageSize, totalCount, onPageChange, onPageSizeChange }) {
  if (totalCount <= 5) return null;
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, totalCount);

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
