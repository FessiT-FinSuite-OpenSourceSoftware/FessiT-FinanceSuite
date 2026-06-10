import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { isTauri, saveBytesToDownloads, showDownloadNotification } from "../../utils/pdfUtils";
import { TabActionBar, FilterSelect, TableWrapper, TableHead, EmptyRow, Pagination } from "../../shared/ui";

async function exportXLSX(rows, filename) {
  let XLSX;
  try { XLSX = (await import("xlsx")).default ?? (await import("xlsx")); } catch { XLSX = window.XLSX; }
  if (!XLSX) { alert("XLSX library not available."); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GST Transactions");
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

function toGSTRows(data) {
  return data.map((t) => ({
    "Name": t.party || "-",
    "Invoice No": t.invoiceNo || "-",
    "Invoice Date": formatDate(t.date),
    "CGST": t.cgst || 0,
    "SGST": t.sgst || 0,
    "IGST": t.igst || 0,
    "Total GST": t.total || 0,
    "Type": t.type || "-",
  }));
}

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.$date) return formatDate(value.$date);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

const COLUMNS = [
  { label: "Date" },
  { label: "Invoice No." },
  { label: "Party" },
  { label: "Type" },
  { label: "Taxable Amount", right: true },
  { label: "CGST", right: true },
  { label: "SGST", right: true },
  { label: "IGST", right: true },
  { label: "Total GST", right: true },
];

export default function RecentGSTTransactions({ transactions = [], isLoading = false, selectedMonths = [] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, pageSize, selectedMonths]);
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handler = (e) => { if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDownloadMenu]);

  const filteredTransactions = useMemo(() => {
    const monthSet = buildMonthSet(selectedMonths);
    const query = search.trim().toLowerCase();
    return (Array.isArray(transactions) ? transactions : []).filter((txn) => {
      if (monthSet.size > 0 && !inMonthSet(txn.date, monthSet)) return false;
      const matchSearch =
        !query ||
        (txn.invoiceNo || "").toLowerCase().includes(query) ||
        (txn.party || "").toLowerCase().includes(query) ||
        formatDate(txn.date).toLowerCase().includes(query);
      const matchType = typeFilter === "All" || txn.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter, selectedMonths]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <TabActionBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by invoice number, party, or date..."
      >
        <FilterSelect value={typeFilter} onChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
          <option value="All">All Types</option>
          <option value="Outwards">Outwards</option>
          <option value="Inwards">Inwards</option>
        </FilterSelect>

        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setShowDownloadMenu((p) => !p)}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            {filteredTransactions.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{filteredTransactions.length}</span>
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
                    const rows = toGSTRows(filteredTransactions);
                    const filename = `GST_Transactions${typeFilter !== "All" ? `_${typeFilter}` : ""}`;
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

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={9} message="Loading GST transactions..." />
          ) : paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((txn) => (
      <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">{formatDate(txn.date)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-slate-200">{txn.invoiceNo || "-"}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">{txn.party || "-"}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      txn.type === "Outwards"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {txn.type || "-"}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-700 dark:text-slate-300">
                  {formatMoney(txn.taxable)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-700 dark:text-slate-300">
                  {txn.cgst > 0 ? formatMoney(txn.cgst) : "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-700 dark:text-slate-300">
                  {txn.sgst > 0 ? formatMoney(txn.sgst) : "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-700 dark:text-slate-300">
                  {txn.igst > 0 ? formatMoney(txn.igst) : "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {formatMoney(txn.total)}
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={9} message="No paid invoices found yet." />
          )}
        </tbody>
      </TableWrapper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredTransactions.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
