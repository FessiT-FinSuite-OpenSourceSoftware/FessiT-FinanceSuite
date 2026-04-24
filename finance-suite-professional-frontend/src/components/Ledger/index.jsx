import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ledgerSelector, fetchLedger } from "../../ReduxApi/ledger";
import { fetchCustomerData, customerSelector } from "../../ReduxApi/customer";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import {
  StatCard,
  TabActionBar,
  FilterSelect,
  TableWrapper,
  TableHead,
  EmptyRow,
  Pagination,
} from "../../shared/ui";

const ENTRY_TYPES = [
  "opening_balance",
  "invoice",
  "payment",
  "credit_note",
  "debit_note",
  "adjustment",
  "reversal",
];

const entryTypeColor = (type) => {
  switch (type) {
    case "invoice":         return "bg-blue-100 text-blue-700";
    case "payment":         return "bg-green-100 text-green-700";
    case "credit_note":     return "bg-purple-100 text-purple-700";
    case "debit_note":      return "bg-orange-100 text-orange-700";
    case "reversal":        return "bg-red-100 text-red-700";
    case "adjustment":      return "bg-yellow-100 text-yellow-700";
    case "opening_balance": return "bg-gray-100 text-gray-700";
    default:                return "bg-gray-100 text-gray-700";
  }
};

const cap = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Backend stores amounts in paise (smallest unit) — divide by 100 for display
const fmtAmount = (paise) => {
  if (paise == null) return "-";
  return `₹${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (val) => {
  if (!val) return "-";
  // MongoDB DateTime comes as { $date: { $numberLong: "..." } } or ISO string
  const raw = val?.$date?.$numberLong ? new Date(Number(val.$date.$numberLong)) : new Date(val);
  return isNaN(raw.getTime()) ? "-" : raw.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getId = (c) => c?._id?.$oid || c?._id || c?.id || "";

export default function LedgerPage() {
  const dispatch = useDispatch();
  const { entries, isLoading, total, totalAmount } = useSelector(ledgerSelector);
  const { customersData } = useSelector(customerSelector);

  const [partyId, setPartyId]       = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [entryType, setEntryType]   = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [resetKey, setResetKey]     = useState(0);

  // PDF modal state
  const [pdfModal, setPdfModal]         = useState(false);
  const [pdfFrom, setPdfFrom]           = useState("");
  const [pdfTo, setPdfTo]               = useState("");
  const [pdfPartyId, setPdfPartyId]     = useState("");
  const [pdfLoading, setPdfLoading]     = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const params = {};
      if (pdfFrom)    params.from     = new Date(pdfFrom).toISOString();
      if (pdfTo)      params.to       = new Date(pdfTo).toISOString();
      if (pdfPartyId) params.party_id = pdfPartyId;
      const response = await axiosInstance.get("/ledger/pdf", {
        params,
        responseType: "blob",
      });
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "ledger.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPdfModal(false);
      setPdfFrom("");
      setPdfTo("");
      setPdfPartyId("");
      toast.success("Ledger PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => { dispatch(fetchCustomerData()); }, [dispatch]);
  console.log("the ledger data we have ", totalAmount)
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setResetKey((k) => k + 1);
  }, [partyId, fromDate, toDate, entryType, pageSize]);

  // Fetch on page change or filter reset
  useEffect(() => {
    const params = { page: currentPage, limit: pageSize };
    if (partyId)           params.party_id = partyId;
    if (fromDate)          params.from     = fromDate;
    if (toDate)            params.to       = toDate;
    dispatch(fetchLedger(params));
  }, [dispatch, resetKey, currentPage]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Client-side entry type filter (backend doesn't support it yet)
  const filtered = entryType === "All"
    ? entries
    : entries.filter((e) => e.entryType === entryType);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Ledger — use filters to search"
      >
        {/* Party filter */}
        <FilterSelect value={partyId} onChange={setPartyId}>
          <option value="">All Parties</option>
          {(Array.isArray(customersData) ? customersData : []).map((c) => (
            <option key={getId(c)} value={getId(c)}>
              {c.companyName || c.customerName}
            </option>
          ))}
        </FilterSelect>

        {/* Entry type filter */}
        {/* <FilterSelect value={entryType} onChange={setEntryType}>
          <option value="All">All Types</option>
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>{cap(t)}</option>
          ))}
        </FilterSelect> */}

        {/* Date range */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          title="To date"
        />

        {/* Download PDF button */}
        <button
          onClick={() => setPdfModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
      </TabActionBar>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Entries" value={total} />
        <StatCard label="Total Amount" value={fmtAmount(totalAmount * 100)} valueClass="text-indigo-700" />
        {/* <StatCard
          label="Debits (Page)"
          value={fmtAmount(filtered.reduce((s, e) => s + (Number(e.debit) || 0), 0))}
          valueClass="text-red-600"
        /> */}
        {/* <StatCard
          label="Credits (Page)"
          value={fmtAmount(filtered.reduce((s, e) => s + (Number(e.credit) || 0), 0))}
          valueClass="text-green-600"
        /> */}
      </div>

      <TableWrapper>
        <TableHead
          columns={[
            { label: "Date" },
            { label: "Party" },
            { label: "Type" },
            { label: "Reference" },
            { label: "Description" },
            { label: "Debit", right: true },
            { label: "Credit", right: true },
            { label: "Balance", right: true },
            { label: "Status" },
          ]}
        />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={9} message="Loading ledger..." />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={9} />
          ) : filtered.map((entry, idx) => {
            const isReversed = entry.isReversed === true;
            return (
              <tr key={entry._id?.$oid || idx} className={`hover:bg-gray-50 transition-colors ${isReversed ? "opacity-50" : ""}`}>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                  {fmtDate(entry.date)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                  {entry.partyNameSnapshot || "-"}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${entryTypeColor(entry.entryType)}`}>
                    {cap(entry.entryType)}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-600">
                  {entry.referenceNumber || "-"}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                  {entry.description || "-"}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                  {entry.debit > 0 ? fmtAmount(entry.debit) : "-"}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {entry.credit > 0 ? fmtAmount(entry.credit) : "-"}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {fmtAmount(entry.balance)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm">
                  {isReversed ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Reversed</span>
                  ) : entry.status ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{cap(entry.status)}</span>
                  ) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrapper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => setPageSize(n)}
      />

      {/* PDF Download Modal */}
      {pdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Download Ledger PDF</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={pdfFrom}
                  onChange={(e) => setPdfFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={pdfTo}
                  onChange={(e) => setPdfTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party (optional)</label>
                <select
                  value={pdfPartyId}
                  onChange={(e) => setPdfPartyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Parties</option>
                  {(Array.isArray(customersData) ? customersData : []).map((c) => (
                    <option key={getId(c)} value={getId(c)}>
                      {c.companyName || c.customerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPdfModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {pdfLoading ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
