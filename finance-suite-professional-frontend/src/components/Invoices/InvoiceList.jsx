import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchInvoiceData, deleteInvoice, updateInvoice, invoiceSelector } from "../../ReduxApi/invoice";
import { fetchIncomingInvoices, deleteIncomingInvoice, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import { getCurrencySymbol as getCurrencySymbolUtil, formatNumber as formatNumberUtil } from "../../utils/formatNumber";
import { useSelector as useAuthSelector } from "react-redux";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { orgamisationSelector } from "../../ReduxApi/organisation";

// 🔑 Helper to safely extract Mongo ObjectId as string
const getInvoiceId = (invoice) => {
  if (!invoice) return "";

  // If backend already sends `id` as a plain string
  if (typeof invoice.id === "string") return invoice.id;

  // Mongo style: _id as string or as { $oid: "..." }
  if (invoice._id) {
    if (typeof invoice._id === "string") return invoice._id;
    if (
      typeof invoice._id === "object" &&
      invoice._id !== null &&
      typeof invoice._id.$oid === "string"
    ) {
      return invoice._id.$oid;
    }
  }

  return "";
};

// 💰 Helper to get currency symbol - use the utility function
const getCurrencySymbol = (currencyType) => {
  return getCurrencySymbolUtil(currencyType);
};

export default function InvoiceList() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { invoiceData, isLoading, isError } = useSelector(invoiceSelector);
  const { data: incomingData, isLoading: inLoading } = useSelector(incomingInvoiceSelector);
  const { user } = useAuthSelector(authSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);
  const orgCurrency = currentOrganisation?.currency || "INR";
  const isAdmin = user?.is_admin === true;
  const hasWrite = canWrite(user, Module.Invoice);
  const hasDelete = canDelete(user, Module.Invoice);
  
  const [activeTab, setActiveTab] = useState("outgoing");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Incoming invoices from Redux
  const incomingInvoices = Array.isArray(incomingData) ? incomingData : [];
  const [inSearch, setInSearch] = useState("");
  const [inStatusFilter, setInStatusFilter] = useState("All");
  const [inPage, setInPage] = useState(1);
  const inItemsPerPage = 10;

  const getIncomingId = (inv) => {
    if (typeof inv.id === "string") return inv.id;
    if (inv._id) {
      if (typeof inv._id === "string") return inv._id;
      if (typeof inv._id === "object" && inv._id?.$oid) return inv._id.$oid;
    }
    return "";
  };

  const filteredIncoming = incomingInvoices.filter((b) => {
    const matchSearch = (b.invoice_number || "").toLowerCase().includes(inSearch.toLowerCase()) || (b.vendor_name || "").toLowerCase().includes(inSearch.toLowerCase());
    const matchStatus = inStatusFilter === "All" || b.status === inStatusFilter;
    return matchSearch && matchStatus;
  });
  const inTotalPages = Math.ceil(filteredIncoming.length / inItemsPerPage) || 1;
  const inStart = (inPage - 1) * inItemsPerPage;
  const currentIncoming = filteredIncoming.slice(inStart, inStart + inItemsPerPage);

  const getInStatusColor = (s) => {
    if (s === "Paid") return "bg-green-100 text-green-800";
    if (s === "Overdue") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  // 🔽 controls the Domestic / International dropdown
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  const [showIncomingOptions, setShowIncomingOptions] = useState(false);
  const [statusModal, setStatusModal] = useState(null); // { id, currentStatus }
  const [selectedStatus, setSelectedStatus] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [approxConversionRate, setApproxConversionRate] = useState("");

  const itemsPerPage = 10;

  // Fetch invoices from Redux on mount
  useEffect(() => {
    dispatch(fetchInvoiceData());
    dispatch(fetchIncomingInvoices());
  }, [dispatch]);

  // Reset to first page whenever filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, currencyFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800";
      case "Raised": return "bg-blue-100 text-blue-800";
      case "Created":
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadgeClass = (invoiceType) => {
    if (invoiceType === "international") {
      return "bg-emerald-100 text-emerald-700";
    }
    // default domestic
    return "bg-blue-100 text-blue-700";
  };

  const getTypeLabel = (invoiceType) => {
    if (invoiceType === "international") return "International";
    return "Domestic";
  };

  // Navigate helpers
  const createDomesticInvoice = () => {
    setShowInvoiceOptions(false);
    nav("/invoices/addInvoice?type=domestic");
  };

  const createInternationalInvoice = () => {
    setShowInvoiceOptions(false);
    nav("/invoices/addInvoice?type=international");
  };

  const onEdit = (id) => {
    nav(`/invoices/editInvoice/${id}`);
  };

  const handleStatusUpdate = async () => {
    const fullInvoice = invoiceData.find((inv) => getInvoiceId(inv) === statusModal.id);
    if (!fullInvoice) return;
    const isSameCurrency = statusModal.currency === orgCurrency;
    const payload = {
      ...fullInvoice,
      status: selectedStatus,
      conversionRate: selectedStatus === "Paid" ? (isSameCurrency ? "1" : String(conversionRate)) : (fullInvoice.conversionRate || ""),
      approxconversionRate: selectedStatus === "Raised" ? (isSameCurrency ? "1" : String(approxConversionRate)) : (fullInvoice.approxconversionRate || ""),
    };
    await dispatch(updateInvoice(statusModal.id, payload));
    setStatusModal(null);
    setConversionRate("");
    setApproxConversionRate("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await dispatch(deleteInvoice(id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIncoming = async (id) => {
    if (!window.confirm("Are you sure you want to delete this incoming invoice?")) return;
    dispatch(deleteIncomingInvoice(id));
  };

  // 🔍 Filtering logic
  const invoices = Array.isArray(invoiceData) ? invoiceData : [];
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceNumber = (invoice.invoice_number || "").toLowerCase();
    const companyName = (invoice.company_name || "").toLowerCase();
    const customerName = (
      invoice.billcustomer_name ||
      invoice.customer_name ||
      ""
    ).toLowerCase();

    const matchesSearch =
      invoiceNumber.includes(searchTerm.toLowerCase()) ||
      companyName.includes(searchTerm.toLowerCase()) ||
      customerName.includes(searchTerm.toLowerCase());

    const status = invoice.status || "Draft";
    const matchesStatus = statusFilter === "All" || status === statusFilter;

    const currency = invoice.currency_type || "INR";
    let matchesCurrency = true;
    
    if (currencyFilter !== "All") {
      if (currencyFilter === "Others") {
        // Show currencies that are not INR, USD, or EUR
        matchesCurrency = !['INR', 'USD', 'EUR'].includes(currency);
      } else {
        matchesCurrency = currency === currencyFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesCurrency;
  });

  // 📄 Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countByStatus = (status) =>
    invoices.filter((i) => (i.status || "Created") === status).length;

  const countOverdue = invoices.filter((i) => {
    if ((i.status || "Created") === "Paid") return false;
    const due = i.invoice_dueDate || i.due_date || "";
    if (!due) return false;
    return new Date(due) < today;
  }).length;

  const countRaised = invoices.filter((i) => {
    if ((i.status || "Created") === "Paid") return false;
    const due = i.invoice_dueDate || i.due_date || "";
    const isOverdue = due && new Date(due) < today;
    return !isOverdue && (i.status || "Created") === "Raised";
  }).length;

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "outgoing"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Outgoing Invoices
        </button>
        <button
          onClick={() => setActiveTab("incoming")}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "incoming"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Incoming Invoices
        </button>
      </div>

      {activeTab === "incoming" ? (
        <div className="max-w-7xl lg:w-full md:w-full">
          {/* Incoming Action Bar */}
          <div className="sticky top-[88px] z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by bill number or vendor..."
                  className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                  value={inSearch}
                  onChange={(e) => { setInSearch(e.target.value); setInPage(1); }}
                />
              </div>
              <div className="flex items-center gap-2 pr-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={inStatusFilter}
                  onChange={(e) => { setInStatusFilter(e.target.value); setInPage(1); }}
                >
                  <option value="All">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                </select>
                {hasWrite && (
                  <div className="relative">
                    <button
                      onClick={() => setShowIncomingOptions((p) => !p)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Create</span>
                    </button>
                    {showIncomingOptions && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button onClick={() => { setShowIncomingOptions(false); nav("/invoices/addIncomingInvoice?type=domestic"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🏠 Domestic Bill</button>
                        <button onClick={() => { setShowIncomingOptions(false); nav("/invoices/addIncomingInvoice?type=international"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🌍 International Bill</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Incoming Stats */}
          {(() => {
            const now = new Date(); now.setHours(0,0,0,0);
            const inOverdue = (b) => b.status !== "Paid" && b.due_date && new Date(b.due_date) < now;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Bills</p><p className="text-2xl font-bold text-gray-900">{incomingInvoices.length}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Paid</p><p className="text-2xl font-bold text-green-600">{incomingInvoices.filter(b => b.status === "Paid").length}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Unpaid</p><p className="text-2xl font-bold text-yellow-600">{incomingInvoices.filter(b => b.status !== "Paid" && !inOverdue(b)).length}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Overdue</p><p className="text-2xl font-bold text-red-600">{incomingInvoices.filter(inOverdue).length}</p></div>
              </div>
            );
          })()}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bill No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inLoading ? (
                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                  ) : currentIncoming.length > 0 ? currentIncoming.map((bill) => {
                    const bid = getIncomingId(bill);
                    return (
                      <tr key={bid || bill.invoice_number} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 cursor-pointer" onClick={() => bid && nav(`/invoices/editIncomingInvoice/${bid}`)}>{bill.invoice_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{bill.vendor_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.invoice_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.due_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{getCurrencySymbol(bill.currency_type)} {formatNumberUtil(bill.total || 0, bill.currency_type)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInStatusColor(bill.status)}`}>{bill.status || "Unpaid"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* <button onClick={() => bid && nav(`/invoices/viewIncomingInvoice/${bid}`)} className="text-gray-600 hover:text-blue-600 transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button> */}
                            <button onClick={() => bid && nav(`/invoices/editIncomingInvoice/${bid}`)} disabled={!hasWrite} className={`transition-colors ${hasWrite ? "text-gray-600 hover:text-green-600" : "text-gray-300 cursor-not-allowed"}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => bid && handleDeleteIncoming(bid)} disabled={!hasDelete} className={`transition-colors ${hasDelete ? "text-gray-600 hover:text-red-600" : "text-gray-300 cursor-not-allowed"}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No incoming invoices found. Create one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredIncoming.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">Showing {inStart + 1} to {Math.min(inStart + inItemsPerPage, filteredIncoming.length)} of {filteredIncoming.length} results</p>
                <div className="flex gap-1">
                  {[...Array(inTotalPages)].map((_, i) => (
                    <button key={i + 1} onClick={() => setInPage(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${inPage === i + 1 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}>{i + 1}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="max-w-7xl lg:w-full md:w-full ">
        {/* Action Bar */}
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by invoice number, customer, or company..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter + Create Invoice dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Created">Created</option>
                  <option value="Raised">Raised</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                >
                  <option value="All">All Currency</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Create Invoice dropdown (Domestic / International) */}
              <div className="relative">
                <button
                  onClick={() => hasWrite && setShowInvoiceOptions((prev) => !prev)}
                  disabled={!hasWrite}
                  className={`flex items-center mr-2 gap-2 px-4 py-2 rounded-lg transition-colors ${
                    hasWrite
                      ? "cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-gray-200 text-gray-400"
                  }`}
                  title={!hasWrite ? "You don't have permission to create invoices" : ""}
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create</span>
                </button>

                {showInvoiceOptions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={createDomesticInvoice}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🏠 Domestic Invoice
                    </button>
                    <button
                      onClick={createInternationalInvoice}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🌍 International Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">Error loading invoices. Please try again.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">{countByStatus("Paid")}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Raised</p>
            <p className="text-2xl font-bold text-blue-600">{countRaised}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{countOverdue}</p>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  {/* 🔹 New Type Column */}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentInvoices.length > 0 ? (
                  currentInvoices.map((invoice) => {
                    const id = getInvoiceId(invoice);
                    const customerName =
                      invoice.billcustomer_name ||
                      invoice.customer_name ||
                      "";
                    const invoiceDate =
                      invoice.invoice_date || invoice.date || "";
                    const dueDate =
                      invoice.invoice_dueDate || invoice.due_date || "";

                    // 🔹 Safely derive type; default to domestic if missing
                    const invoiceType =
                      invoice.invoice_type === "international"
                        ? "international"
                        : "domestic";

                    return (
                      <tr
                        key={id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td
                          className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                          onClick={() => onEdit(id)}
                        >
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customerName}
                        </td>

                        {/* 🔹 Type cell */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(
                              invoiceType
                            )}`}
                          >
                            {getTypeLabel(invoiceType)}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          {invoiceDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          {dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">
                          {getCurrencySymbol(invoice.currency_type)} {formatNumberUtil(invoice.total || 0, invoice.currency_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            onClick={(e) => { e.stopPropagation(); if (hasWrite) { const s = invoice.status || "Created"; if (s === "Paid" && !isAdmin) return; setShowInvoiceOptions(false); setSelectedStatus(s); setConversionRate(invoice.conversionRate ? String(invoice.conversionRate) : ""); setApproxConversionRate(invoice.approxconversionRate ? String(invoice.approxconversionRate) : ""); setStatusModal({ id, currentStatus: s, currency: invoice.currency_type || "INR" }); } }}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status || "Created")} ${
                              hasWrite && (isAdmin || (invoice.status || "Created") !== "Paid") ? "cursor-pointer hover:opacity-75" : "cursor-default"
                            }`}
                            title={!hasWrite ? "" : (invoice.status === "Paid" && !isAdmin) ? "Only admins can modify Paid invoices" : "Click to update status"}
                          >
                            {invoice.status || "Created"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => hasWrite && onEdit(id)}
                              disabled={!hasWrite}
                              className={`transition-colors ${
                                hasWrite
                                  ? "cursor-pointer text-gray-600 hover:text-green-600"
                                  : "cursor-not-allowed text-gray-300"
                              }`}
                              title={!hasWrite ? "No write permission" : "Edit"}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => hasDelete && handleDelete(id)}
                              disabled={!hasDelete}
                              className={`transition-colors ${
                                hasDelete
                                  ? "cursor-pointer text-gray-600 hover:text-red-600"
                                  : "cursor-not-allowed text-gray-300"
                              }`}
                              title={!hasDelete ? "No delete permission" : "Delete"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {isLoading
                        ? "Loading..."
                        : "No invoices found. Try creating one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredInvoices.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} results
              </p>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === index + 1
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      )}

      {/* Status Update Modal */}
      {statusModal && (() => {
              const cur = statusModal.currentStatus;
              // Non-admins cannot modify Paid invoices, and cannot downgrade Raised → Created
              const isFullyLocked = !isAdmin && cur === "Paid";
              const isRaisedLocked = !isAdmin && cur === "Raised";
              // Allowed options for non-admin: Created→[Raised], Raised→[Raised,Paid], admin→all
              const allowedOptions = isAdmin
                ? ["Created", "Raised", "Paid"]
                : cur === "Created"
                  ? ["Created", "Raised"]
                  : cur === "Raised"
                    ? ["Raised", "Paid"]
                    : [cur];
              const isLocked = isFullyLocked;
              return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Invoice Status</h3>
            {isFullyLocked && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Only admins can modify a Paid invoice.</p>
            )}
            {isRaisedLocked && (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">Status can only move forward: Raised → Paid. Only admins can revert.</p>
            )}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); }}
              disabled={isLocked}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLocked ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "border-gray-300"
              }`}
            >
              {allowedOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {selectedStatus === "Raised" && (() => {
              const isSame = statusModal.currency === orgCurrency;
              return (
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Approx Conversion Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} ×</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={isSame ? "1" : "Enter approx rate"}
                      value={approxConversionRate}
                      onChange={(e) => setApproxConversionRate(e.target.value)}
                      disabled={isSame}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isSame ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "border-gray-300"
                      }`}
                    />
                  </div>
                  <p className="text-xs mt-1 text-gray-400">
                    {isSame
                      ? `Same currency — no conversion needed (${orgCurrency})`
                      : `Approx rate: ${statusModal.currency} → ${orgCurrency}`}
                  </p>
                </div>
              );
            })()}
            {selectedStatus === "Paid" && (() => {
              const isSame = statusModal.currency === orgCurrency;
              return (
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Conversion Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">1 {statusModal.currency} ×</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={isSame ? "1" : "Enter rate"}
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                      disabled={isSame}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isSame ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "border-gray-300"
                      }`}
                    />
                  </div>
                  <p className="text-xs mt-1 text-gray-400">
                    {isSame
                      ? `Same currency — no conversion needed (${orgCurrency})`
                      : `Converting from ${statusModal.currency} → ${orgCurrency}`}
                  </p>
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setStatusModal(null); setConversionRate(""); setApproxConversionRate(""); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isLocked}
                className={`px-4 py-2 text-sm rounded-lg ${
                  isLocked ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Update
              </button>
            </div>
          </div>
        </div>
              );
            })()}
    </div>
  );
}