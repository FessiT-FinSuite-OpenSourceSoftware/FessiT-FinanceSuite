import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Download, Search } from "lucide-react";
import { isTauri, saveBytesToDownloads, showDownloadNotification } from "../../utils/pdfUtils";
import { TabActionBar, FilterSelect, DataTable, InfoCard, Pagination } from "../../shared/ui";

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

const EXPORT_COLUMNS = [
  { label: "Date", key: (d) => fmtDate(d.date) },
  { label: "Deductee", key: (d) => d.deductee || "" },
  { label: "Employee ID", key: (d) => d.emp_id || "" },
  { label: "Invoice No", key: (d) => d.invoice_number || "" },
  { label: "PAN", key: (d) => d.pan || "" },
  { label: "Section", key: (d) => d.tds_section_key || "" },
  { label: "Source", key: (d) => d.source || "" },
  { label: "Amount", key: (d) => d.amount || 0 },
  { label: "TDS Rate (%)", key: (d) => d.tdsRate || 0 },
  { label: "TDS Amount", key: (d) => d.tdsAmount || 0 },
  { label: "Status", key: (d) => d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : "" },
];

function toRows(data) {
  return data.map((d) => Object.fromEntries(EXPORT_COLUMNS.map((c) => [c.label, c.key(d)])));
}

async function exportXLSX(data, filename) {
  let XLSX;
  try { XLSX = (await import("xlsx")).default ?? (await import("xlsx")); } catch { XLSX = window.XLSX; }
  if (!XLSX) { alert("XLSX library not available. Please use CSV export."); return; }
  const rows = toRows(data);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = EXPORT_COLUMNS.map((col) => ({ wch: Math.max(col.label.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TDS Deductions");
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

async function exportCSV(data, filename) {
  const rows = toRows(data);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const fullName = `${filename}.csv`;
  let filePath = null;
  if (isTauri()) {
    const result = await saveBytesToDownloads(new TextEncoder().encode("\uFEFF" + csv), fullName);
    filePath = result.filePath;
  } else {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = fullName; a.click();
    URL.revokeObjectURL(url);
  }
  await showDownloadNotification(fullName, filePath);
}

export default function TDSDeductions({ deductions = [], isLoading = false, selectedMonths = [] }) {
  const [search, setSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  useEffect(() => { setCurrentPage(1); }, [search, sectionSearch, sourceFilter, statusFilter, pageSize, selectedMonths]);
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handler = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target))
        setShowDownloadMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDownloadMenu]);
  const filtered = useMemo(() => {
    const monthSet = buildMonthSet(selectedMonths);
    const q = search.trim().toLowerCase();
    const sq = sectionSearch.trim().toLowerCase();
    return deductions.filter((d) => {
      const dateToCheck = d.source === "Invoice" ? d.date : (d.period || d.date);
      if (monthSet.size > 0 && !inMonthSet(dateToCheck, monthSet)) return false;
      const matchSearch = !q ||
        (d.deductee || "").toLowerCase().includes(q) ||
        (d.pan || "").toLowerCase().includes(q) ||
        (d.invoice_number || "").toLowerCase().includes(q) ||
        fmtDate(d.date).toLowerCase().includes(q);
      const matchSection = !sq ||
        (d.tds_section_key || "").toLowerCase().includes(sq) ||
        (d.tds_section_old || "").toLowerCase().includes(sq) ||
        (d.tds_section_new || "").toLowerCase().includes(sq);
      const matchSource = sourceFilter === "All" || 
        (sourceFilter === "Invoice" ? (d.source === "Invoice" || d.source === "Contract" || d.source === "Intern") : d.source === sourceFilter);
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      return matchSearch && matchSection && matchSource && matchStatus;
    });
  }, [deductions, search, sectionSearch, sourceFilter, statusFilter, selectedMonths]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalTds = filtered.reduce((s, d) => s + (d.tdsAmount || 0), 0);

  const columns = [
    {
      label: "Date",
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">{fmtDate(d.date)}</span>,
    },
    {
      label: "Deductee",
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">{d.deductee}</p>
          {d.invoice_number && d.invoice_number !== "-" && (
            <p className="text-xs text-blue-600 font-mono">{d.invoice_number}</p>
          )}
          {d.emp_id && d.emp_id !== "-" && (
            <p className="text-xs text-gray-400">ID: {d.emp_id}</p>
          )}
        </div>
      ),
    },
    {
      label: "PAN",
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 font-mono whitespace-nowrap">{d.pan}</span>,
    },
    {
      label: "Section",
      render: (d) => (
        <div className="whitespace-nowrap space-y-0.5">
          {/* {d.tds_section_key
            ? <span className="inline-flex px-2 py-0.5 text-xs font-bold font-mono rounded bg-indigo-100 text-indigo-700">{d.tds_section_key}</span>
            : <span className="text-sm text-gray-400">—</span>
          } */}
          {d.tds_section_old && <p className="text-s font-semibold text-gray-900 dark:text-slate-200">{d.tds_section_key}</p>}
          {/* {d.tds_section_new && <p className="text-[10px] text-indigo-500">{d.tds_section_new}</p>} */}
        </div>
      ),
    },
    {
      label: "Source",
      render: (d) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          d.source === "Salary" ? "bg-purple-100 text-purple-800" :
          d.source === "Contract" ? "bg-orange-100 text-orange-800" :
          d.source === "Intern" ? "bg-pink-100 text-pink-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {d.source}
        </span>
      ),
    },
    {
      label: "Amount", right: true,
      render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">₹ {fmt(d.amount)}</span>,
    },
    // {
    //   label: "TDS Rate", right: true,
    //   render: (d) => <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">{d.tdsRate}%</span>,
    // },
    {
      label: "TDS Amount", right: true,
      render: (d) => <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">₹ {fmt(d.tdsAmount)}</span>,
    },
    {
      label: "Status",
      render: (d) => (
        <span className={`inline-flex justify-center w-24 px-2 py-1 text-xs font-semibold rounded-full ${d.status === "deposited" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
          }`}>
          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
        </span>
      ),
    },
  ];
  const filename = useMemo(() => {
    const parts = ["TDS_Deductions"];
    if (sourceFilter !== "All") parts.push(sourceFilter);
    if (statusFilter !== "All") parts.push(statusFilter);
    if (selectedMonths.length === 1)
      parts.push(`${selectedMonths[0].year}-${String(selectedMonths[0].month).padStart(2, "0")}`);
    else if (selectedMonths.length > 1) parts.push(`${selectedMonths.length}months`);
    return parts.join("_");
  }, [sourceFilter, statusFilter, selectedMonths]);

  const handleDownload = useCallback(async (format) => {
    setShowDownloadMenu(false);
    if (!filtered.length) return;
    try {
      if (format === "xlsx") await exportXLSX(filtered, filename);
      else await exportCSV(filtered, filename);
    } catch (err) {
      console.error("Export failed:", err);
      try {
        toast.error(`Export failed: ${err.message}`);
      } catch {
        alert(`Export failed: ${err.message}`);  // Tauri fallback
      }
    }
  }, [filtered, filename]);

  return (
    <div>
      <TabActionBar
        sticky={false}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        searchPlaceholder="Search by deductee, PAN, invoice no, or date..."
      >

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={sectionSearch}
            onChange={(e) => { setSectionSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search section code..."
            className="pl-8 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>
        <FilterSelect value={sourceFilter} onChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
          <option value="All">All Sources</option>
          <option value="Salary">Salary</option>
          <option value="Invoice">Invoice</option>
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="deposited">Deposited</option>
          <option value="pending">Pending</option>
        </FilterSelect>

        {/* ── Export button ── */}
        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setShowDownloadMenu((p) => !p)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            {filtered.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {filtered.length}
              </span>
            )}
          </button>

          {showDownloadMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 overflow-hidden">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700">
                Export as
              </p>
              {[
                { fmt: "csv", label: "CSV", desc: "Spreadsheet compatible" },
                { fmt: "xlsx", label: "XLSX", desc: "Excel workbook" },
              ].map(({ fmt, label, desc }) => (
                <button
                  key={fmt}
                  onClick={() => handleDownload(fmt)}
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
          <span className="font-semibold text-gray-800 dark:text-slate-200">Total TDS: ₹ {fmt(totalTds)}</span>
        </div>
      )}
      {(
        search ||
        sectionSearch ||
        sourceFilter !== "All" ||
        statusFilter !== "All" ||
        selectedMonths.length > 0
      ) && (
          <div className="flex flex-wrap items-center gap-2 mb-3 px-1">

            {search && (
              <button
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200 transition"
              >
                Search: {search}
                <span className="text-sm">×</span>
              </button>
            )}

            {sectionSearch && (
              <button
                onClick={() => setSectionSearch("")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition"
              >
                Section: {sectionSearch}
                <span className="text-sm">×</span>
              </button>
            )}

            {sourceFilter !== "All" && (
              <button
                onClick={() => setSourceFilter("All")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition"
              >
                Source: {sourceFilter}
                <span className="text-sm">×</span>
              </button>
            )}

            {statusFilter !== "All" && (
              <button
                onClick={() => setStatusFilter("All")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium hover:bg-orange-200 transition"
              >
                Status: {statusFilter}
                <span className="text-sm">×</span>
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
        emptyMessage="No deductions found."
        columns={columns}
        renderExpanded={(d) => (
          <div className="p-4 rounded-2xl bg-[#ECEEF2] dark:bg-slate-700/50">
            {d.source === "Invoice" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <InfoCard label="Invoice Number" value={d.invoice_number} />
                <InfoCard label="Invoice Date" value={fmtDate(d.date)} />
                <InfoCard label="Due Date" value={fmtDate(d.due_date)} />
                <InfoCard label="Status" value={d.status.charAt(0).toUpperCase() + d.status.slice(1)} />
                <InfoCard label="Vendor / Deductee" value={d.deductee} />
                <InfoCard label="Vendor GSTIN" value={d.vendor_gstin} />
                <InfoCard label="PAN" value={d.pan} />
                <InfoCard label="Place of Supply" value={d.place_of_supply} />
                <InfoCard label="TDS Rate" value={`${d.tdsRate}%`} />
                <InfoCard label="TDS Amount" value={`₹ ${fmt(d.tdsAmount)}`} valueClassName="text-red-600 font-bold" />
                <InfoCard label="Taxable Amount" value={`₹ ${fmt(d.amount)}`} />
                <InfoCard label="Total (before TDS)" value={`₹ ${fmt(d.total_before_tds)}`} />
                <InfoCard label="CGST" value={`₹ ${fmt(d.total_cgst)}`} />
                <InfoCard label="SGST" value={`₹ ${fmt(d.total_sgst)}`} />
                <InfoCard label="IGST" value={`₹ ${fmt(d.total_igst)}`} />
                <InfoCard label="Payment Type" value={d.payment_type} />
                <InfoCard label="Payment Reference" value={d.payment_reference} />
                {d.tds_section_nature && <InfoCard label="TDS Section Nature" value={d.tds_section_nature} className="xl:col-span-2" />}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <InfoCard label="Employee" value={d.deductee} />
                <InfoCard label="Employee ID" value={d.emp_id} />
                <InfoCard label="PAN" value={d.pan} />
                <InfoCard label="Period" value={d.period} />
                <InfoCard label="Designation" value={d.designation} />
                <InfoCard label="Department" value={d.department} />
                <InfoCard label="Gross Salary" value={`₹ ${fmt(d.amount)}`} />
                <InfoCard label="Basic Salary" value={`₹ ${fmt(d.basic_salary)}`} />
                <InfoCard label="Net Salary" value={`₹ ${fmt(d.net_salary)}`} />
                <InfoCard label="TDS Rate" value={`${d.tdsRate}%`} />
                <InfoCard label="TDS Amount" value={`₹ ${fmt(d.tdsAmount)}`} valueClassName="text-red-600 font-bold" />
                <InfoCard label="Payment Mode" value={d.payment_mode} />
                <InfoCard label="Paid On" value={fmtDate(d.date)} />
                <InfoCard label="Status" value={d.status.charAt(0).toUpperCase() + d.status.slice(1)} />
                {d.tds_section_nature && <InfoCard label="TDS Section Nature" value={d.tds_section_nature} className="xl:col-span-2" />}
              </div>
            )}
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
