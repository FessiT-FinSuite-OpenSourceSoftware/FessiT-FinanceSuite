import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchInvoiceData, deleteInvoice, updateInvoice, invoiceSelector } from "../../ReduxApi/invoice";
import { getCurrencySymbol, formatNumber } from "../../utils/formatNumber";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { orgamisationSelector } from "../../ReduxApi/organisation";
import {
  TabActionBar,
  FilterSelect,
  StatCard,
  TableWrapper,
  TableHead,
  EmptyRow,
  RowActions,
  Pagination,
} from "../../shared/ui";
import { toast } from "react-toastify";

const getInvoiceId = (invoice) => {
  if (!invoice) return "";
  if (typeof invoice.id === "string") return invoice.id;
  if (typeof invoice._id === "string") return invoice._id;
  if (invoice._id && typeof invoice._id === "object" && typeof invoice._id.$oid === "string") {
    return invoice._id.$oid;
  }
  return "";
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    if (typeof value === "object" && value.$date) {
      return new Date(value.$date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
};

const getStatusColor = (status) => {
  switch ((status || "New").toUpperCase()) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "ISSUED":
      return "bg-blue-100 text-blue-800";
    case "ON HOLD":
      return "bg-yellow-100 text-yellow-800";
    case "NEW":
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeBadgeClass = (type) =>
  type === "international" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";

const getTypeLabel = (type) => (type === "international" ? "International" : "Domestic");

export default function InvoiceList() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { invoiceData, isLoading } = useSelector(invoiceSelector);
  const { user } = useSelector(authSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);

  const orgCurrency = currentOrganisation?.currency || "INR";
  const isAdmin = user?.is_admin === true;
  const hasWrite = canWrite(user, Module.Invoice);
  const hasDelete = canDelete(user, Module.Invoice);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [approxConversionRate, setApproxConversionRate] = useState("");

  useEffect(() => {
    dispatch(fetchInvoiceData());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, currencyFilter]);

  const invoices = Array.isArray(invoiceData) ? invoiceData : [];

  const filtered = invoices.filter((invoice) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (invoice.invoice_number || "").toLowerCase().includes(q) ||
      (invoice.company_name || "").toLowerCase().includes(q) ||
      (invoice.billcustomer_name || invoice.customer_name || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || (invoice.status || "New") === statusFilter;
    const cur = invoice.currency_type || "INR";
    const matchCurrency =
      currencyFilter === "All" ||
      (currencyFilter === "Others" ? !["INR", "USD", "EUR"].includes(cur) : cur === currencyFilter);
    return matchSearch && matchStatus && matchCurrency;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const countByStatus = (status) => invoices.filter((invoice) => (invoice.status || "New") === status).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countOverdue = invoices.filter((invoice) => {
    if ((invoice.status || "New") === "Paid") return false;
    const due = invoice.invoice_dueDate || invoice.due_date || "";
    return due && new Date(due) < today;
  }).length;

  const countRaised = invoices.filter((invoice) => {
    if ((invoice.status || "New") === "Paid") return false;
    const due = invoice.invoice_dueDate || invoice.due_date || "";
    return !due || new Date(due) >= today ? (invoice.status || "New") === "Issued" : false;
  }).length;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    dispatch(deleteInvoice(id));
  };

  const openStatusModal = (invoice) => {
    const currentStatus = invoice.status || "New";
    if (!hasWrite) return;
    if (currentStatus === "Paid" && !isAdmin) return;

    setSelectedStatus(currentStatus);
    setConversionRate(invoice.conversionRate ? String(invoice.conversionRate) : "");
    setApproxConversionRate(invoice.approxconversionRate ? String(invoice.approxconversionRate) : "");
    setStatusModal({
      id: getInvoiceId(invoice),
      currentStatus,
      currency: invoice.currency_type || "INR",
    });
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    setSelectedStatus("");
    setConversionRate("");
    setApproxConversionRate("");
  };

  const handleStatusUpdate = async () => {
    if (!statusModal) return;

    const fullInvoice = invoices.find((invoice) => getInvoiceId(invoice) === statusModal.id);
    if (!fullInvoice) return;

    const isSameCurrency = statusModal.currency === orgCurrency;

    if (selectedStatus === "Paid" && !isSameCurrency && !conversionRate.trim()) {
      toast.error("Conversion rate is required for Paid status");
      return;
    }
    if (selectedStatus === "Issued" && !isSameCurrency && !approxConversionRate.trim()) {
      toast.error("Approx conversion rate is required for Issued status");
      return;
    }

    const payload = {
      ...fullInvoice,
      status: selectedStatus,
      conversionRate:
        selectedStatus === "Paid"
          ? isSameCurrency
            ? "1"
            : String(conversionRate)
          : fullInvoice.conversionRate || "",
      approxconversionRate:
        selectedStatus === "Issued"
          ? isSameCurrency
            ? "1"
            : String(approxConversionRate)
          : fullInvoice.approxconversionRate || "",
    };

    const result = await dispatch(updateInvoice(statusModal.id, payload));
    if (result) {
      closeStatusModal();
    }
  };

  const statusOptions = statusModal
    ? (isAdmin
        ? [ "Issued", "Paid", "On Hold"]
        : statusModal.currentStatus === "New"
          ? ["Issued"]
          : statusModal.currentStatus === "Issued"
            ? ["Issued", "Paid", "On Hold"]
            : statusModal.currentStatus === "On Hold"
              ? ["On Hold", "Issued", "Paid"]
              : [statusModal.currentStatus])
    : [];

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by invoice number, customer, or company..."
      >
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Status</option>
          <option value="New">New</option>
          <option value="Issued">Issued</option>
          <option value="Paid">Paid</option>
          <option value="On Hold">On Hold</option>
        </FilterSelect>

        <FilterSelect
          value={currencyFilter}
          onChange={(value) => {
            setCurrencyFilter(value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Currency</option>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="Others">Others</option>
        </FilterSelect>

        <div className="relative">
          <button
            onClick={() => hasWrite && setShowCreateMenu((prev) => !prev)}
            disabled={!hasWrite}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              hasWrite
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>

          {showCreateMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  nav("/invoices/addInvoice?type=domestic");
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Domestic Invoice
              </button>
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  nav("/invoices/addInvoice?type=international");
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                International Invoice
              </button>
            </div>
          )}
        </div>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Invoices" value={invoices.length} />
        <StatCard label="Paid" value={countByStatus("Paid")} valueClass="text-green-600" />
        <StatCard label="Issued" value={countRaised} valueClass="text-blue-600" />
        <StatCard label="Overdue" value={countOverdue} valueClass="text-red-600" />
      </div>

      <TableWrapper>
        <TableHead
          columns={[
            { label: "Invoice No" },
            { label: "Customer" },
            { label: "Type" },
            { label: "Date", hidden: true },
            { label: "Due Date", hidden: true },
            { label: "Amount" },
            { label: "Status" },
            { label: "Actions", right: true },
          ]}
        />
        <tbody className="divide-y divide-gray-200">
          {paginated.length > 0 ? (
            paginated.map((invoice) => {
              const id = getInvoiceId(invoice);
              const customerName = invoice.billcustomer_name || invoice.customer_name || "";
              const invoiceDate = formatDate(invoice.invoice_date || invoice.date || "");
              const dueDate = formatDate(invoice.invoice_dueDate || invoice.due_date || "");
              const invoiceType = invoice.invoice_type === "international" ? "international" : "domestic";
              const locked = (invoice.status || "New") === "Paid" && !isAdmin;

              return (
                <tr key={id} className="hover:bg-gray-50 transition-colors">
                  <td
                    className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                    onClick={() => nav(`/invoices/editInvoice/${id}`)}
                  >
                    {invoice.invoice_number || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{customerName || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(invoiceType)}`}>
                      {getTypeLabel(invoiceType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{invoiceDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{dueDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {getCurrencySymbol(invoice.currency_type)} {formatNumber(invoice.total || 0, invoice.currency_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      onClick={() => !locked && openStatusModal(invoice)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status || "New")} ${
                        !locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"
                      }`}
                    >
                      {invoice.status || "New"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <RowActions
                      onEdit={() => hasWrite && nav(`/invoices/editInvoice/${id}`)}
                      onDelete={() => hasDelete && handleDelete(id)}
                      canEdit={hasWrite}
                      canDelete={hasDelete}
                    />
                  </td>
                </tr>
              );
            })
          ) : (
            <EmptyRow colSpan={8} message={isLoading ? "Loading..." : "No invoices found."} />
          )}
        </tbody>
      </TableWrapper>

      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setCurrentPage(1);
          }}
        />
      )}

      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Invoice Status</h3>

            {!isAdmin && statusModal.currentStatus === "Paid" && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Only admins can modify a Paid invoice.
              </p>
            )}

            <div className="flex flex-wrap gap-4 mb-3">
              {statusOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                  <input
                    type="radio"
                    name="status"
                    value={option}
                    checked={selectedStatus === option}
                    onChange={() => setSelectedStatus(option)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="font-medium">{option}</span>
                </label>
              ))}
            </div>

            {selectedStatus === "Issued" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">Approx Conversion Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} x</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={statusModal.currency === orgCurrency ? "1" : "Enter approx rate"}
                    value={approxConversionRate}
                    onChange={(e) => setApproxConversionRate(e.target.value)}
                    disabled={statusModal.currency === orgCurrency}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      statusModal.currency === orgCurrency
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
            )}

            {selectedStatus === "Paid" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">Conversion Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} x</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={statusModal.currency === orgCurrency ? "1" : "Enter rate"}
                    value={conversionRate}
                    onChange={(e) => setConversionRate(e.target.value)}
                    disabled={statusModal.currency === orgCurrency}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      statusModal.currency === orgCurrency
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
