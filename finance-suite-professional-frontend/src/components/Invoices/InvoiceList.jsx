import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { Plus, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchInvoiceData, deleteInvoice, updateInvoice, invoiceSelector } from "../../ReduxApi/invoice";
import { getCurrencySymbol, formatNumber } from "../../utils/formatNumber";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { orgamisationSelector } from "../../ReduxApi/organisation";
import {
  TabActionBar, FilterSelect, StatCard, DataTable, RowActions, Pagination, TruncatedCell, ConfirmModal,
} from "../../shared/ui";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { isTauri, saveBytesToDownloads, showDownloadNotification } from "../../utils/pdfUtils";

const getInvoiceId = (invoice) => {
  if (!invoice) return "";
  if (typeof invoice.id === "string") return invoice.id;
  if (typeof invoice._id === "string") return invoice._id;
  if (invoice._id?.$oid) return invoice._id.$oid;
  return "";
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    if (typeof value === "object" && value.$date)
      return new Date(value.$date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};

const getStatusColor = (status) => {
  switch ((status || "New").toUpperCase()) {
    case "PAID":    return "bg-green-100 text-green-800";
    case "ISSUED":  return "bg-blue-100 text-blue-800";
    case "ON HOLD": return "bg-yellow-100 text-yellow-800";
    default:        return "bg-gray-100 text-gray-800";
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
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const [statusModal, setStatusModal] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [approxConversionRate, setApproxConversionRate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => { dispatch(fetchInvoiceData()); }, [dispatch]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, currencyFilter, typeFilter]);
  useEffect(() => {
    if (!statusModal) return;
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, [statusModal]);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target))
        setShowDownloadMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buildExportRows = () => filtered.map((inv) => ({
    "Invoice No": inv.invoice_number || "-",
    "Customer": inv.billcustomer_name || inv.customer_name || "-",
    "Invoice Date": formatDate(inv.invoice_date || inv.date || ""),
    "Due Date": formatDate(inv.invoice_dueDate || inv.due_date || ""),
    "Type": inv.invoice_type === "international" ? "International" : "Domestic",
    "Currency": inv.currency_type || "INR",
    "Sub Total": inv.subTotal || "0",
    "Total CGST": inv.totalcgst || "0",
    "Total SGST": inv.totalsgst || "0",
    "Total IGST": inv.totaligst || "0",
    "Total": inv.total || "0",
    "Status": inv.status || "New",
    "Payment Type": inv.payment_type || "-",
    "Payment Reference": inv.payment_reference || "-",
    "Place of Supply": inv.place_of_supply || "-",
    "GSTIN": inv.billcustomer_gstin || "-",
  }));

  const handleDownload = async (format) => {
    setShowDownloadMenu(false);
    const rows = buildExportRows();
    if (!rows.length) { toast.info("No data to export"); return; }
    const filename = `sales-report-${new Date().toISOString().slice(0, 10)}`;
    const toastId = toast.loading("Preparing export...");

    try {
      let bytes;
      let fullName;

      if (format === "json") {
        fullName = `${filename}.json`;
        bytes = new TextEncoder().encode(JSON.stringify(rows, null, 2));
      } else if (format === "csv") {
        fullName = `${filename}.csv`;
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(","), ...rows.map((r) =>
          headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )].join("\n");
        bytes = new TextEncoder().encode(csv);
      } else if (format === "xlsx") {
        fullName = `${filename}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
        bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      } else if (format === "tsv") {
        fullName = `${filename}.tsv`;
        const headers = Object.keys(rows[0]);
        const tsv = [headers.join("\t"), ...rows.map((r) =>
          headers.map((h) => String(r[h] ?? "")).join("\t")
        )].join("\n");
        bytes = new TextEncoder().encode(tsv);
      }

      toast.dismiss(toastId);

      let filePath = null;
      if (isTauri()) {
        const result = await saveBytesToDownloads(bytes, fullName);
        filePath = result.filePath;
      } else {
        const mimeMap = { json: "application/json", csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tsv: "text/tab-separated-values" };
        const blob = new Blob([bytes], { type: mimeMap[format] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fullName; a.click();
        URL.revokeObjectURL(url);
      }

      await showDownloadNotification(fullName, filePath);
    } catch (err) {
      toast.update(toastId, { render: `Export failed: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
    }
  };

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
    const matchType =
      typeFilter === "All" ||
      (typeFilter === "international" ? invoice.invoice_type === "international" : invoice.invoice_type !== "international");
    return matchSearch && matchStatus && matchCurrency && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const countByStatus = (status) => invoices.filter((i) => (i.status || "New") === status).length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const countOverdue = invoices.filter((i) => {
    if ((i.status || "New") === "Paid") return false;
    const due = i.invoice_dueDate || i.due_date || "";
    return due && new Date(due) < today;
  }).length;
  const countRaised = invoices.filter((i) => {
    if ((i.status || "New") === "Paid") return false;
    const due = i.invoice_dueDate || i.due_date || "";
    return (!due || new Date(due) >= today) ? (i.status || "New") === "Issued" : false;
  }).length;

  const handleDelete = (id, invoiceNumber) => {
    setDeleteModal({ id, invoiceNumber });
  };

  const openStatusModal = (invoice) => {
    const currentStatus = invoice.status || "New";
    if (!hasWrite) return;
    if (currentStatus === "Paid" && !isAdmin) return;
    setSelectedStatus(currentStatus);
    setConversionRate(invoice.conversionRate ? String(invoice.conversionRate) : "");
    setApproxConversionRate(invoice.approxconversionRate ? String(invoice.approxconversionRate) : "");
    setPaymentType(invoice.payment_type || "");
    setPaymentReference(invoice.payment_reference || "");
    setStatusModal({ id: getInvoiceId(invoice), currentStatus, currency: invoice.currency_type || "INR" });
  };

  const closeStatusModal = () => {
    setStatusModal(null); setSelectedStatus(""); setConversionRate("");
    setApproxConversionRate(""); setPaymentType(""); setPaymentReference("");
  };

  const handleStatusUpdate = async () => {
    if (!statusModal) return;
    const fullInvoice = invoices.find((i) => getInvoiceId(i) === statusModal.id);
    if (!fullInvoice) return;
    const isSameCurrency = statusModal.currency === orgCurrency;
    if (selectedStatus === "Paid" && !isSameCurrency && !conversionRate.trim()) { toast.error("Conversion rate is required for Paid status"); return; }
    if (selectedStatus === "Paid" && !paymentType) { toast.error("Payment type is required for Paid status"); return; }
    if (selectedStatus === "Issued" && !isSameCurrency && !approxConversionRate.trim()) { toast.error("Approx conversion rate is required for Issued status"); return; }
    const payload = {
      ...fullInvoice, status: selectedStatus,
      conversionRate: selectedStatus === "Paid" ? (isSameCurrency ? "1" : String(conversionRate)) : fullInvoice.conversionRate || "",
      approxconversionRate: selectedStatus === "Issued" ? (isSameCurrency ? "1" : String(approxConversionRate)) : fullInvoice.approxconversionRate || "",
      payment_type: selectedStatus === "Paid" ? paymentType : fullInvoice.payment_type || "",
      payment_reference: selectedStatus === "Paid" ? paymentReference : fullInvoice.payment_reference || "",
    };
    const result = await dispatch(updateInvoice(statusModal.id, payload));
    if (result) closeStatusModal();
  };

  const statusOptions = statusModal
    ? (isAdmin ? ["Issued", "Paid", "On Hold"]
      : statusModal.currentStatus === "New" ? ["Issued"]
      : statusModal.currentStatus === "Issued" ? ["Issued", "Paid", "On Hold"]
      : statusModal.currentStatus === "On Hold" ? ["On Hold", "Issued", "Paid"]
      : [statusModal.currentStatus])
    : [];

  const columns = [
    {
      label: "Invoice No",
      render: (invoice) => {
        const id = getInvoiceId(invoice);
        return <span className="text-blue-600 font-medium cursor-pointer" onClick={() => nav(`/invoices/editInvoice/${id}`)}>{invoice.invoice_number || "-"}</span>;
      },
    },
    {
      label: "Customer",
      render: (invoice) => <TruncatedCell text={invoice.billcustomer_name || invoice.customer_name || "-"} />,
    },
    // {
    //   label: "Type",
    //   render: (invoice) => {
    //     const t = invoice.invoice_type === "international" ? "international" : "domestic";
    //     return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(t)}`}>{getTypeLabel(t)}</span>;
    //   },
    // },
    { label: "Invoice Date",     hidden: true, render: (invoice) => formatDate(invoice.invoice_date || invoice.date || "") },
    { label: "Due Date", hidden: true, render: (invoice) => formatDate(invoice.invoice_dueDate || invoice.due_date || "") },
    {
      label: "Amount",
      render: (invoice) => <span className="font-semibold">{getCurrencySymbol(invoice.currency_type)} {formatNumber(invoice.total || 0, invoice.currency_type)}</span>,
    },
    {
      label: "Status",
      render: (invoice) => {
        const locked = (invoice.status || "New") === "Paid" && !isAdmin;
        return (
          <span
            onClick={() => !locked && openStatusModal(invoice)}
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status || "New")} ${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
          >
            {invoice.status || "New"}
          </span>
        );
      },
    },
    {
      label: "Payment Info",
      hidden: true,
      render: (invoice) => (invoice.status || "New") === "Paid" ? (
        <div className="flex flex-col gap-0.5">
          {invoice.payment_type && <span className="font-medium text-gray-800">{invoice.payment_type}</span>}
          {/* {invoice.payment_reference && <span className="text-xs text-indigo-600 font-mono">{invoice.payment_reference}</span>} */}
        </div>
      ) : "—",
    },
    {
      label: "Actions",
      right: true,
      stopPropagation: true,
      render: (invoice) => {
        const id = getInvoiceId(invoice);
        return (
          <RowActions
            onEdit={() => hasWrite && nav(`/invoices/editInvoice/${id}`)}
            onDelete={() => hasDelete && handleDelete(id, invoice.invoice_number)}
            canEdit={hasWrite} canDelete={hasDelete}
          />
        );
      },
    },
  ];

  return (
    <div className="w-full lg:w-full md:w-full">
      <TabActionBar
        searchValue={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        searchPlaceholder="Search by invoice number, customer, or company..."
      >
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="New">New</option>
          <option value="Issued">Issued</option>
          <option value="Paid">Paid</option>
          <option value="On Hold">On Hold</option>
        </FilterSelect>
        <FilterSelect value={currencyFilter} onChange={(v) => { setCurrencyFilter(v); setCurrentPage(1); }}>
          <option value="All">All Currency</option>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="Others">Others</option>
        </FilterSelect>
        <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <option value="All">All Types</option>
          <option value="domestic">Domestic</option>
          <option value="international">International</option>
        </FilterSelect>
        <div className="relative" ref={downloadMenuRef}>
          {/* <button
            onClick={() => setShowDownloadMenu((p) => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            {filtered.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{filtered.length}</span>
            )}
          </button> */}
          {showDownloadMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">Export as</p>
              {[
                { fmt: "csv",  label: "CSV",  desc: "Spreadsheet compatible" },
                { fmt: "xlsx", label: "XLSX", desc: "Excel workbook" },
                { fmt: "json", label: "JSON", desc: "Raw data" },
                { fmt: "tsv",  label: "TSV",  desc: "Tab-separated" },
              ].map(({ fmt, label, desc }) => (
                <button
                  key={fmt}
                  onClick={() => handleDownload(fmt)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => hasWrite && setShowCreateMenu((prev) => !prev)}
            disabled={!hasWrite}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
          </button>
          {showCreateMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button onClick={() => { setShowCreateMenu(false); nav("/invoices/addInvoice?type=domestic"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🏠 Domestic</button>
              <button onClick={() => { setShowCreateMenu(false); nav("/invoices/addInvoice?type=international"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🌍 International</button>
            </div>
          )}
        </div>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Invoices" value={invoices.length} />
        <StatCard label="Paid"    value={countByStatus("Paid")}  valueClass="text-green-600" />
        <StatCard label="Issued"  value={countRaised}            valueClass="text-blue-600" />
        <StatCard label="Overdue" value={countOverdue}           valueClass="text-red-600" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={paginated}
        rowKey={getInvoiceId}
        columns={columns}
      />

      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage} totalPages={totalPages} pageSize={pageSize}
          totalCount={filtered.length} onPageChange={setCurrentPage}
          onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
        />
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete invoice <span className="font-medium">{deleteModal.invoiceNumber}</span>? This cannot be undone.</>}
          onConfirm={() => { dispatch(deleteInvoice(deleteModal.id)); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {statusModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Invoice Status</h3>
            {!isAdmin && statusModal.currentStatus === "Paid" && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Only admins can modify a Paid invoice.</p>
            )}
            <div className="flex flex-wrap gap-4 mb-3">
              {statusOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                  <input type="radio" name="status" value={option} checked={selectedStatus === option} onChange={() => setSelectedStatus(option)} className="w-4 h-4 accent-blue-600" />
                  <span className="font-medium">{option}</span>
                </label>
              ))}
            </div>
            {selectedStatus === "Issued" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">Approx Conversion Rate</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} x</span>
                  <input type="number" min="0" step="any" placeholder={statusModal.currency === orgCurrency ? "1" : "Enter approx rate"} value={approxConversionRate} onChange={(e) => setApproxConversionRate(e.target.value)} disabled={statusModal.currency === orgCurrency}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusModal.currency === orgCurrency ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "border-gray-300"}`} />
                </div>
              </div>
            )}
            {selectedStatus === "Paid" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Conversion Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} x</span>
                    <input type="number" min="0" step="any" placeholder={statusModal.currency === orgCurrency ? "1" : "Enter rate"} value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} disabled={statusModal.currency === orgCurrency}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusModal.currency === orgCurrency ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "border-gray-300"}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Type *</label>
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select payment type</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="NEFT/RTGS">NEFT/RTGS</option>
                    <option value="Other">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Reference</label>
                  <input type="text" placeholder="UTR / Cheque no. / Transaction ID" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeStatusModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusUpdate} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
