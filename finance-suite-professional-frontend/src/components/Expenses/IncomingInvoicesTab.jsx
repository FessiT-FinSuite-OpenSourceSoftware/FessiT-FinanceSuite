import React, { useState } from "react";
import { Plus, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { updateIncomingInvoice, deleteIncomingInvoice, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { StatCard, TabActionBar, FilterSelect, TableWrapper, EmptyRow, StatusBadge, RowActions, Pagination } from "../../shared/ui";

const getIncomingId = (inv) => {
  if (typeof inv.id === "string") return inv.id;
  if (inv._id) {
    if (typeof inv._id === "string") return inv._id;
    if (typeof inv._id === "object" && inv._id?.$oid) return inv._id.$oid;
  }
  return "";
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const isOverdue = (b) => {
  if (b.status === "Paid") return false;
  const due = b.due_date || "";
  if (!due) return false;
  return new Date(due) < today;
};

const statusColor = (s) => {
  if (s === "Paid")    return "bg-green-100 text-green-800";
  if (s === "Overdue") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};

export default function IncomingInvoicesTab() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { data: incomingData, isLoading } = useSelector(incomingInvoiceSelector);
  const { user } = useSelector(authSelector);
  const isAdmin   = user?.is_admin === true;
  const hasWrite  = canWrite(user, Module.Invoice);
  const hasDelete = canDelete(user, Module.Invoice);

  const invoices = Array.isArray(incomingData) ? incomingData : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [statusPopup, setStatusPopup] = useState(null);
  const [paymentDetail, setPaymentDetail] = useState(null); // bill object

  const handleStatusSave = () => {
    if (statusPopup.status === "Paid") {
      if (!statusPopup.paidDate) { toast.error("Please select a paid date"); return; }
      if (!statusPopup.paymentType) { toast.error("Payment type is required"); return; }
    }
    const bill = invoices.find((b) => getIncomingId(b) === statusPopup.id);
    if (!bill) return;
    dispatch(updateIncomingInvoice(statusPopup.id, {
      ...bill,
      status: statusPopup.status,
      paid_date: statusPopup.status === "Paid" ? statusPopup.paidDate : bill.paid_date,
      payment_type: statusPopup.status === "Paid" ? statusPopup.paymentType : bill.payment_type,
      payment_reference: statusPopup.status === "Paid" ? statusPopup.paymentReference : bill.payment_reference,
    }));
    setStatusPopup(null);
  };

  const filtered = invoices.filter((b) => {
    const matchSearch =
      (b.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.vendor_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const current = filtered.slice(start, start + pageSize);
  const totalAmount = invoices.reduce((s, b) => s + Number(b.total || 0), 0);
  const totalTds = invoices.filter(b => b.tds_applicable).reduce((s, b) => s + Number(b.tds_total || 0), 0);

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this incoming invoice?")) return;
    dispatch(deleteIncomingInvoice(id));
  };

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search by bill number or vendor...">
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Not Yet Paid</option>
          <option value="Overdue">Overdue</option>
        </FilterSelect>
        {hasWrite && (
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
            {showTypeMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button onClick={() => { setShowTypeMenu(false); nav("/expenses/addIncomingInvoice?type=domestic"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🏠 Domestic</button>
                <button onClick={() => { setShowTypeMenu(false); nav("/expenses/addIncomingInvoice?type=international"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🌍 International</button>
              </div>
            )}
          </div>
        )}
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Records"   value={invoices.length} />
        <StatCard label="Total Amount"  value={`₹ ${totalAmount.toLocaleString("en-IN")}`} valueClass="text-indigo-700" />
        <StatCard label="Total TDS"     value={`₹ ${totalTds.toLocaleString("en-IN")}`} valueClass="text-red-600" />
        <StatCard label="Unpaid"        value={invoices.filter((b) => b.status !== "Paid" && !isOverdue(b)).length} valueClass="text-yellow-600" />
      </div>

      <TableWrapper>
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Invoice Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount (INR)</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">TDS (INR)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid Date</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={8} message="Loading..." />
          ) : current.length === 0 ? (
            <EmptyRow colSpan={8} message="No incoming invoices found." />
          ) : current.map((bill) => {
            const bid = getIncomingId(bill);
            return (
              <tr key={bid || bill.invoice_number} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer" onClick={() => bid && nav(`/expenses/editIncomingInvoice/${bid}`)}>{bill.invoice_number}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{bill.vendor_name}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">{formatDate(bill.invoice_date)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">{formatDate(bill.due_date)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-800 text-center">{(bill.total)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 text-center">
                  {bill.tds_applicable ? ` ${Number(bill.tds_total || 0).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {(() => { const locked = bill.status === "Paid" && !isAdmin; return (
                    <span onClick={() => !locked && hasWrite && setStatusPopup({ id: bid, status: bill.status || "Unpaid", paidDate: bill.paid_date || "", paymentType: bill.payment_type || "", paymentReference: bill.payment_reference || "" })} className={`${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}>
                      <StatusBadge status={bill.status === "Unpaid" ? "Not Yet Paid" : (bill.status || "Not Yet Paid")} colorFn={statusColor} />
                    </span>
                  ); })()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {bill.status === "Paid" && bill.paid_date ? formatDate(bill.paid_date) : "—"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {bill.status === "Paid" && (
                      <button
                        onClick={() => setPaymentDetail(bill)}
                        title="Payment Details"
                        className="text hover:text-green-800 transition-colors"
                      >
                        <IndianRupee className="w-4 h-4" />
                      </button>
                    )}
                    <RowActions
                      onEdit={() => bid && nav(`/expenses/editIncomingInvoice/${bid}`)}
                      onDelete={() => bid && handleDelete(bid)}
                      canEdit={hasWrite}
                      canDelete={hasDelete}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrapper>

      {statusPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Invoice Status</h3>
            <select
              value={statusPopup.status}
              onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value, paidDate: "" }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Unpaid">Not Yet Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
            {statusPopup.status === "Paid" && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paid Date *</label>
                  <input
                    type="date"
                    value={statusPopup.paidDate || ""}
                    onChange={(e) => setStatusPopup((p) => ({ ...p, paidDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Type *</label>
                  <select
                    value={statusPopup.paymentType || ""}
                    onChange={(e) => setStatusPopup((p) => ({ ...p, paymentType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select payment type</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="NEFT/RTGS">NEFT/RTGS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Reference</label>
                  <input
                    type="text"
                    placeholder="UTR / Cheque no. / Transaction ID"
                    value={statusPopup.paymentReference || ""}
                    onChange={(e) => setStatusPopup((p) => ({ ...p, paymentReference: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusPopup(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}

      {paymentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Payment Details</h3>
              <button onClick={() => setPaymentDetail(null)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice No</span>
                <span className="font-medium text-gray-800">{paymentDetail.invoice_number || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vendor</span>
                <span className="font-medium text-gray-800">{paymentDetail.vendor_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-semibold text-gray-900">₹ {Number(paymentDetail.total || 0).toLocaleString("en-IN")}</span>
              </div>
              {paymentDetail.tds_applicable && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TDS Deducted</span>
                  <span className="font-medium text-red-600">₹ {Number(paymentDetail.tds_total || 0).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid Date</span>
                  <span className="font-medium text-gray-800">{formatDate(paymentDetail.paid_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Type</span>
                  <span className="font-medium text-gray-800">{paymentDetail.payment_type || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-medium text-indigo-600 font-mono text-xs">{paymentDetail.payment_reference || "—"}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setPaymentDetail(null)}
              className="mt-5 w-full px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
      />
    </div>
  );
}
