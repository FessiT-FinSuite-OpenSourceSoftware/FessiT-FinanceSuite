import React, { useMemo, useState, useEffect } from "react";
import { TabActionBar, FilterSelect, TableWrapper, TableHead, EmptyRow, Pagination } from "../../shared/ui";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.$date) return formatDate(value.$date);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const now = new Date();
const THIS_MONTH = now.getMonth();
const THIS_YEAR  = now.getFullYear();

const isThisMonth = (value) => {
  if (!value) return false;
  if (typeof value === "object" && value.$date) return isThisMonth(value.$date);
  const raw = String(value).trim();
  // period format "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return y === THIS_YEAR && m - 1 === THIS_MONTH;
  }
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.getMonth() === THIS_MONTH && d.getFullYear() === THIS_YEAR;
};

const COLUMNS = [
  { label: "Date" },
  { label: "Deductee" },
  { label: "PAN" },
  { label: "Section" },
  { label: "Source" },
  { label: "Amount", right: true },
  { label: "TDS Rate", right: true },
  { label: "TDS Amount", right: true },
  { label: "Status" },
];

export default function TDSDeductions({ deductions = [], isLoading = false }) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [search, sourceFilter, statusFilter, pageSize]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deductions.filter((d) => {
      if (!isThisMonth(d.date)) return false;
      const matchSearch = !q ||
        (d.deductee || "").toLowerCase().includes(q) ||
        (d.pan || "").toLowerCase().includes(q) ||
        formatDate(d.date).toLowerCase().includes(q);
      const matchSource = sourceFilter === "All" || d.source === sourceFilter;
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      return matchSearch && matchSource && matchStatus;
    });
  }, [deductions, search, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalTds = filtered.reduce((s, d) => s + (d.tdsAmount || 0), 0);

  return (
    <div>
      <TabActionBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        searchPlaceholder="Search by deductee, PAN, or date..."
      >
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
      </TabActionBar>

      {filtered.length > 0 && (
        <div className="mb-4 px-1 flex gap-6 text-sm text-gray-600">
          <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-gray-800">Total TDS: ₹ {formatMoney(totalTds)}</span>
        </div>
      )}

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={9} message="Loading deductions..." />
          ) : paginated.length > 0 ? (
            paginated.map((ded) => (
              <tr key={ded.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(ded.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{ded.deductee}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{ded.pan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ded.section}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ded.source === "Salary" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                    {ded.source}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{formatMoney(ded.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{ded.tdsRate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-800">{formatMoney(ded.tdsAmount)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ded.status === "deposited" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                    {ded.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={9} message="No deductions found." />
          )}
        </tbody>
      </TableWrapper>

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
