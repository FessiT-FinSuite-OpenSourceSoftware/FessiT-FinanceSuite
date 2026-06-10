import React, { useMemo, useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { isTauri, saveBytesToDownloads, showDownloadNotification } from "../../utils/pdfUtils";
import { TabActionBar, FilterSelect, DataTable, InfoCard, Pagination } from "../../shared/ui";

async function exportXLSX(rows, filename) {
  let XLSX;
  try { XLSX = (await import("xlsx")).default ?? (await import("xlsx")); } catch { XLSX = window.XLSX; }
  if (!XLSX) { alert("XLSX library not available."); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PT Deductions");
  const fullName = `${filename}.xlsx`;
  let filePath = null;
  if (isTauri()) {
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const result = await saveBytesToDownloads(new Uint8Array(bytes), fullName);
    filePath = result.filePath;
  } else {
    XLSX.writeFile(wb, fullName);
  }
  await showDownloadNotification(fullName, filePath);
}

async function exportCSV(rows, filename) {
  const headers = Object.keys(rows[0]);
  const escape = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const fullName = `${filename}.csv`;
  let filePath = null;
  if (isTauri()) {
    const result = await saveBytesToDownloads(new TextEncoder().encode("\uFEFF" + csv), fullName);
    filePath = result.filePath;
  } else {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fullName; a.click();
    URL.revokeObjectURL(url);
  }
  await showDownloadNotification(fullName, filePath);
}

function toPTRows(data) {
  return data.map((d) => ({
    "Name": d.emp_name || "-",
    "Employee ID": d.emp_id || "-",
    "Invoice Date": d.period || fmtDate(d.date),
    "TDS Amount": d.tds || 0,
    "PT Amount": d.ptAmount || 0,
    "Gross Salary": d.gross_salary || 0,
    "Net Salary": d.net_salary || 0,
    "Status": d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : "-",
  }));
}

const fmt = (value) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const fmtDate = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.$date) return fmtDate(value.$date);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function buildMonthSet(selectedMonths) {
  return new Set(
    (Array.isArray(selectedMonths) ? selectedMonths : []).map(
      ({ year, month }) => `${year}-${String(month).padStart(2, "0")}`
    )
  );
}

function inMonthSet(value, monthSet) {
  if (!value) return false;
  if (typeof value === "object" && value.$date) return inMonthSet(value.$date, monthSet);
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}/.test(raw)) return monthSet.has(raw.slice(0, 7));
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return monthSet.has(`${raw.slice(6, 10)}-${raw.slice(3, 5)}`);
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return monthSet.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  return false;
}

export default function PTDeductions({ deductions = [], isLoading = false, selectedMonths = [] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, pageSize, selectedMonths]);
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handler = (e) => { if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDownloadMenu]);

  const filtered = useMemo(() => {
    const monthSet = buildMonthSet(selectedMonths);
    const q = search.trim().toLowerCase();
    return deductions.filter((d) => {
      if (monthSet.size > 0 && !inMonthSet(d.period || d.date, monthSet)) return false;
      const matchSearch =
        !q ||
        (d.emp_name || "").toLowerCase().includes(q) ||
        (d.emp_id || "").toLowerCase().includes(q) ||
        fmtDate(d.date).toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deductions, search, statusFilter, selectedMonths]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPt = filtered.reduce((s, d) => s + (d.ptAmount || 0), 0);

  const columns = [
    {
      label: "Period",
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">{d.period || fmtDate(d.date)}</span>,
    },
    {
      label: "Employee",
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">{d.emp_name}</p>
          {d.emp_id && d.emp_id !== "-" && <p className="text-xs text-gray-400 dark:text-slate-500">ID: {d.emp_id}</p>}
        </div>
      ),
    },
    {
      label: "Department",
      render: (d) => <span className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">{d.department || "-"}</span>,
    },
    {
      label: "Gross Salary", right: true,
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">₹ {fmt(d.gross_salary)}</span>,
    },
    {
      label: "PT Amount", right: true,
      render: (d) => <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">₹ {fmt(d.ptAmount)}</span>,
    },
    {
      label: "Net Salary", right: true,
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">₹ {fmt(d.net_salary)}</span>,
    },
    {
      label: "Status",
      render: (d) => (
        <span className={`inline-flex justify-center w-24 px-2 py-1 text-xs font-semibold rounded-full ${
          d.status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
        }`}>
          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <TabActionBar
        sticky={false}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        searchPlaceholder="Search by employee name, ID, or date..."
      >
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </FilterSelect>

        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setShowDownloadMenu((p) => !p)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            {filtered.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{filtered.length}</span>
            )}
          </button>
          {showDownloadMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 overflow-hidden">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700">Export as</p>
              {[{ fmt: "csv", label: "CSV", desc: "Spreadsheet compatible" }, { fmt: "xlsx", label: "XLSX", desc: "Excel workbook" }].map(({ fmt: format, label, desc }) => (
                <button
                  key={format}
                  onClick={() => {
                    setShowDownloadMenu(false);
                    const rows = toPTRows(filtered);
                    const filename = `PT_Deductions${statusFilter !== "All" ? `_${statusFilter}` : ""}`;
                    format === "xlsx" ? exportXLSX(rows, filename) : exportCSV(rows, filename);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </TabActionBar>

      {filtered.length > 0 && (
        <div className="mb-3 px-1 flex gap-6 text-sm text-gray-600 dark:text-slate-400">
          <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-gray-800 dark:text-slate-200">Total PT: ₹ {fmt(totalPt)}</span>
        </div>
      )}

      {(search || statusFilter !== "All" || selectedMonths.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
          {search && (
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200 transition"
            >
              Search: {search} <span className="text-sm">×</span>
            </button>
          )}
          {statusFilter !== "All" && (
            <button
              onClick={() => setStatusFilter("All")}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium hover:bg-orange-200 transition"
            >
              Status: {statusFilter} <span className="text-sm">×</span>
            </button>
          )}
          {selectedMonths.length > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              Months: {selectedMonths.length} selected
            </div>
          )}
        </div>
      )}

      <DataTable
        isLoading={isLoading}
        data={paginated}
        rowKey={(d) => d.id}
        emptyMessage="No professional tax deductions found."
        columns={columns}
        renderExpanded={(d) => (
          <div className="p-4 rounded-2xl bg-[#ECEEF2] dark:bg-slate-700/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <InfoCard label="Employee" value={d.emp_name} />
              <InfoCard label="Employee ID" value={d.emp_id} />
              <InfoCard label="Department" value={d.department} />
              <InfoCard label="Period" value={d.period} />
              <InfoCard label="Gross Salary" value={`₹ ${fmt(d.gross_salary)}`} />
              <InfoCard label="Reimbursement" value={`₹ ${fmt(d.reimbursement)}`} />
              <InfoCard label="TDS" value={`₹ ${fmt(d.tds)}`} />
              <InfoCard label="Professional Tax" value={`₹ ${fmt(d.ptAmount)}`} valueClassName="text-red-600 font-bold" />
              <InfoCard label="Net Salary" value={`₹ ${fmt(d.net_salary)}`} valueClassName="text-green-700 font-bold" />
              <InfoCard label="Paid On" value={fmtDate(d.date)} />
              <InfoCard label="Status" value={d.status.charAt(0).toUpperCase() + d.status.slice(1)} />
            </div>
          </div>
        )}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
      />
    </div>
  );
}
