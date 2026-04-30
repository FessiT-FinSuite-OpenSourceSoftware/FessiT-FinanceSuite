import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ledgerSelector, fetchLedger } from "../../ReduxApi/ledger";
import { fetchCustomerData, customerSelector } from "../../ReduxApi/customer";
import { authSelector } from "../../ReduxApi/auth";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { TableWrapper, TableHead, EmptyRow, Pagination } from "../../shared/ui";
import { Download, RefreshCw, Filter, X } from "lucide-react";

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

const fmtAmount = (paise) => {
  if (paise == null) return "-";
  const val = Number(paise) / 100;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
};

const fmtDate = (val) => {
  if (!val) return "-";
  const raw = val?.$date?.$numberLong ? new Date(Number(val.$date.$numberLong)) : new Date(val);
  return isNaN(raw.getTime()) ? "-" : raw.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getId = (c) => c?._id?.$oid || c?._id || c?.id || "";

export default function LedgerPage() {
  const dispatch = useDispatch();
  const { entries, isLoading, total, totalAmount } = useSelector(ledgerSelector);
  const { customersData } = useSelector(customerSelector);
  const { user } = useSelector(authSelector);
  const isAdmin = user?.is_admin === true;

  const [partyId, setPartyId]     = useState("");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [confirmRecalc, setConfirmRecalc] = useState(false);

  const customers = Array.isArray(customersData) ? customersData : [];
  const selectedParty = customers.find((c) => getId(c) === partyId);
  const hasFilters = partyId || fromDate || toDate;

  const clearFilters = () => { setPartyId(""); setFromDate(""); setToDate(""); };

  useEffect(() => { dispatch(fetchCustomerData({ limit: 200 })); }, [dispatch]);

  useEffect(() => { setCurrentPage(1); }, [partyId, fromDate, toDate, pageSize]);

  useEffect(() => {
    const params = { page: currentPage, limit: pageSize };
    if (partyId)   params.party_id = partyId;
    if (fromDate)  params.from = fromDate;
    if (toDate)    params.to = toDate;
    dispatch(fetchLedger(params));
  }, [dispatch, partyId, fromDate, toDate, pageSize, currentPage]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const params = {};
      if (fromDate) params.from = new Date(fromDate).toISOString();
      if (toDate)   params.to   = new Date(toDate).toISOString();
      if (partyId)  params.party_id = partyId;
      const response = await axiosInstance.get("/ledger/pdf", { params, responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "ledger.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Ledger PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setConfirmRecalc(false);
    setRecalcLoading(true);
    try {
      const { data } = await axiosInstance.post("/ledger/recalculate");
      toast.success(`Balances fixed — ${data.entries_fixed} entries corrected, ${data.parties_fixed} counters reset`);
      const params = { page: currentPage, limit: pageSize };
      if (partyId)  params.party_id = partyId;
      if (fromDate) params.from = fromDate;
      if (toDate)   params.to = toDate;
      dispatch(fetchLedger(params));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to recalculate balances");
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <div className="max-w-7xl w-full space-y-4">

      {/* Filter Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Party */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Party</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">All Parties</option>
              {customers.map((c) => (
                <option key={getId(c)} value={getId(c)}>
                  {c.companyName || c.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {pdfLoading ? "Generating..." : "Download PDF"}
            </button>

            {isAdmin && (
              <button
                onClick={() => setConfirmRecalc(true)}
                disabled={recalcLoading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                title="Recalculate and fix ledger balances"
              >
                <RefreshCw className="w-4 h-4" />
                {recalcLoading ? "Fixing..." : "Fix Balances"}
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {selectedParty && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                <Filter className="w-3 h-3" />
                {selectedParty.companyName || selectedParty.customerName}
                <button onClick={() => setPartyId("")} className="ml-0.5 hover:text-indigo-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {fromDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                From: {fromDate}
                <button onClick={() => setFromDate("")} className="ml-0.5 hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {toDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                To: {toDate}
                <button onClick={() => setToDate("")} className="ml-0.5 hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${totalAmount < 0 ? "text-red-600" : "text-indigo-700"}`}>
            {fmtAmount(totalAmount * 100)}
          </p>
        </div>
        {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Debits</p>
          <p className="text-2xl font-bold text-red-600">
            {fmtAmount(entries.reduce((s, e) => s + (Number(e.debit) || 0), 0))}
          </p>
        </div> */}
        {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-green-600">
            {fmtAmount(entries.reduce((s, e) => s + (Number(e.credit) || 0), 0))}
          </p>
        </div> */}
      </div>

      {/* Table */}
      <TableWrapper>
        <TableHead
          columns={[
            { label: "Date" },
            { label: "Party" },
            // { label: "Type" },
            { label: "Reference" },
            { label: "Description" },
            { label: "Payment Info" },
            { label: "Debit", right: true },
            { label: "Credit", right: true },
            { label: "Balance", right: true },
            
          ]}
        />
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <EmptyRow colSpan={9} message="Loading ledger..." />
          ) : entries.length === 0 ? (
            <EmptyRow colSpan={9} message="No ledger entries found." />
          ) : entries.map((entry, idx) => {
            const isReversed = entry.isReversed === true;
            return (
              <tr
                key={entry._id?.$oid || idx}
                className={`hover:bg-gray-50 transition-colors ${isReversed ? "opacity-40" : ""}`}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {fmtDate(entry.date)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                  {entry.partyNameSnapshot || "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-indigo-600 font-medium">
                  {entry.referenceNumber || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 max-w-[200px] truncate" title={entry.description || ""}>
                  {entry.description || "-"}
                </td>
                <td className="px-4 py-2 text-sm">
                  {isReversed ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Reversed</span>
                  ) : entry.paymentType || entry.paymentReference ? (
                    <div className="flex flex-col gap-0.5">
                      {entry.paymentType && <span className="font-medium text-gray-800">{entry.paymentType}</span>}
                      {entry.paymentReference && <span className="text-xs text-indigo-600 font-mono">{entry.paymentReference}</span>}
                    </div>
                  ) : entry.status ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{cap(entry.status)}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-red-600">
                  {entry.debit > 0 ? fmtAmount(entry.debit) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {entry.credit > 0 ? fmtAmount(entry.credit) : <span className="text-gray-300">—</span>}
                </td>
                <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${entry.balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {fmtAmount(entry.balance)}
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

      {/* Recalculate confirmation modal */}
      {confirmRecalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Fix Ledger Balances</h3>
            <p className="text-sm text-gray-600 mb-1">
              This will recalculate the running balance on all ledger entries and reset party counters to match.
            </p>
            <p className="text-sm text-orange-600 font-medium mb-4">
              No data will be deleted. Only incorrect balance values will be patched.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRecalc(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecalculate} className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">Yes, Fix Balances</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
