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
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return y === THIS_YEAR && m - 1 === THIS_MONTH;
  }
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.getMonth() === THIS_MONTH && d.getFullYear() === THIS_YEAR;
};

const parseDateForSort = (value) => {
  if (!value) return 0;
  if (typeof value === "object" && value.$date) return new Date(value.$date).getTime();
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00`).getTime();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const COLUMNS = [
  { label: "Date" },
  { label: "Reference" },
  { label: "Party / Employee" },
  { label: "Type" },
  { label: "Section" },
  { label: "Gross Amount", right: true },
  { label: "TDS Rate", right: true },
  { label: "TDS Amount", right: true },
];

export default function RecentTDSTransactions({ salaries = [], incomingInvoices = [], isLoading = false }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, pageSize]);

  const transactions = useMemo(() => {
    const salaryTxns = salaries.map((s) => {
      const gross = parseFloat(s.gross_salary || 0);
      const tds = parseFloat(s.tds || 0);
      const rate = gross > 0 ? parseFloat(((tds / gross) * 100).toFixed(2)) : 0;
      return {
        id: `sal-${s._id?.$oid || s.id || s.emp_id}`,
        date: s.paid_on || s.period,
        reference: s.emp_id || "-",
        party: s.emp_name || "-",
        type: "Salary",
        section: "192",
        gross,
        rate,
        tds,
      };
    });

    const invoiceTxns = (Array.isArray(incomingInvoices) ? incomingInvoices : [])
      .filter((inv) => inv.tds_applicable === true)
      .map((inv) => {
        const gross = parseFloat(inv.subTotal || inv.sub_total || 0);
        const tds = parseFloat(inv.tds_total || inv.total_tds || 0);
        const rate = gross > 0 ? parseFloat(((tds / gross) * 100).toFixed(2)) : 0;
        return {
          id: `inv-${inv._id?.$oid || inv.id || inv.invoice_number}`,
          date: inv.invoice_date || inv.paid_on,
          reference: inv.invoice_number || "-",
          party: inv.vendor_name || inv.company_name || "-",
          type: "Invoice",
          section: "194C",
          gross,
          rate,
          tds,
        };
      });

    return [...salaryTxns, ...invoiceTxns]
      .filter((t) => t.date)
      .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
  }, [salaries, incomingInvoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!isThisMonth(t.date)) return false;
      const matchSearch = !q ||
        (t.reference || "").toLowerCase().includes(q) ||
        (t.party || "").toLowerCase().includes(q) ||
        formatDate(t.date).toLowerCase().includes(q);
      const matchType = typeFilter === "All" || t.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalTds = filtered.reduce((s, t) => s + t.tds, 0);

  return (
    <div>
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Search by reference, party, or date...">
        <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <option value="All">All Types</option>
          <option value="Salary">Salary</option>
          <option value="Invoice">Invoice</option>
        </FilterSelect>
      </TabActionBar>

      {filtered.length > 0 && (
        <div className="mb-4 px-1 flex gap-6 text-sm text-gray-600">
          <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-gray-800">Total TDS: ₹ {formatMoney(totalTds)}</span>
        </div>
      )}

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={8} message="Loading TDS transactions..." />
          ) : paginated.length > 0 ? (
            paginated.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(t.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{t.reference}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.party}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${t.type === "Salary" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                    {t.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{t.section}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{formatMoney(t.gross)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{t.rate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-800">{formatMoney(t.tds)}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={8} message="No TDS transactions found." />
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
