import React, { useEffect, useMemo, useState } from "react";
import { TabActionBar, FilterSelect, TableWrapper, TableHead, EmptyRow, Pagination } from "../../shared/ui";

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

export default function RecentGSTTransactions({ transactions = [], isLoading = false }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, pageSize]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (Array.isArray(transactions) ? transactions : []).filter((txn) => {
      if (!isThisMonth(txn.date)) return false;
      const matchSearch =
        !query ||
        (txn.invoiceNo || "").toLowerCase().includes(query) ||
        (txn.party || "").toLowerCase().includes(query) ||
        formatDate(txn.date).toLowerCase().includes(query);
      const matchType = typeFilter === "All" || txn.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter]);

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
        <FilterSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Types</option>
          <option value="Outwards">Outwards</option>
          <option value="Inwards">Inwards</option>
        </FilterSelect>
      </TabActionBar>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={9} message="Loading GST transactions..." />
          ) : paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(txn.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{txn.invoiceNo || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{txn.party || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                  {formatMoney(txn.taxable)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                  {txn.cgst > 0 ? formatMoney(txn.cgst) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                  {txn.sgst > 0 ? formatMoney(txn.sgst) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                  {txn.igst > 0 ? formatMoney(txn.igst) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-800">
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
