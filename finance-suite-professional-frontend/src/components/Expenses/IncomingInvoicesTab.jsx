import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateIncomingInvoice, deleteIncomingInvoice, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { StatCard, TabActionBar, FilterSelect, TableWrapper, TableHead, EmptyRow, StatusBadge, RowActions } from "../../shared/ui";

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

const COLUMNS = [
  { label: "Invoice No" }, { label: "Company" },
  { label: "Date", hidden: true }, { label: "Due Date", hidden: true },
  { label: "Amount" }, { label: "TDS" }, { label: "Status" }, { label: "Actions", right: true },
];

const ITEMS_PER_PAGE = 10;

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
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [statusPopup, setStatusPopup] = useState(null); // { id, status, paidDate }

  const handleStatusSave = () => {
    if (statusPopup.status === "Paid" && !statusPopup.paidDate) {
      toast.error("Please select a paid date");
      return;
    }
    const bill = invoices.find((b) => getIncomingId(b) === statusPopup.id);
    if (!bill) return;
    dispatch(updateIncomingInvoice(statusPopup.id, {
      ...bill,
      status: statusPopup.status,
      paid_date: statusPopup.status === "Paid" ? statusPopup.paidDate : bill.paid_date,
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

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(start, start + ITEMS_PER_PAGE);
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
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={8} message="Loading..." />
          ) : current.length === 0 ? (
            <EmptyRow colSpan={8} message="No incoming invoices found." />
          ) : current.map((bill) => {
            const bid = getIncomingId(bill);
            return (
              <tr key={bid || bill.invoice_number} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 cursor-pointer" onClick={() => bid && nav(`/expenses/editIncomingInvoice/${bid}`)}>{bill.invoice_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bill.vendor_name}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.invoice_date}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.due_date}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{bill.currency_type} {Number(bill.total || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-red-600 text-sm">
                  {bill.tds_applicable ? `${bill.currency_type} ${Number(bill.tds_total || 0).toLocaleString()}` : "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => { const locked = bill.status === "Paid" && !isAdmin; return (
                    <span onClick={() => !locked && hasWrite && setStatusPopup({ id: bid, status: bill.status || "Unpaid", paidDate: bill.paid_date || "" })} className={`${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}>
                      <StatusBadge status={bill.status === "Unpaid" ? "Not Yet Paid" : (bill.status || "Not Yet Paid")} colorFn={statusColor} />
                    </span>
                  ); })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <RowActions
                    onEdit={() => bid && nav(`/expenses/editIncomingInvoice/${bid}`)}
                    onDelete={() => bid && handleDelete(bid)}
                    canEdit={hasWrite}
                    canDelete={hasDelete}
                  />
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
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Paid Date *</label>
                <input
                  type="date"
                  value={statusPopup.paidDate || ""}
                  readOnly={!!statusPopup.paidDate && statusPopup.status === "Paid"}
                  onChange={(e) => setStatusPopup((p) => ({ ...p, paidDate: e.target.value }))}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    statusPopup.paidDate ? "bg-gray-50 text-gray-600" : ""
                  }`}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusPopup(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center mt-0 rounded-b-lg">
          <p className="text-sm text-gray-600">Showing {start + 1} to {Math.min(start + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} results</p>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
