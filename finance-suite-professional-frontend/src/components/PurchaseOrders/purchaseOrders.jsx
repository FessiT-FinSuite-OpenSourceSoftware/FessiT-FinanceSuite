import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchPurchaseOrderData, deletePurchaseOrder, purchaseOrderSelector } from "../../ReduxApi/purchaseOrder";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { getCurrencySymbol } from "../../utils/formatNumber";
import { TabActionBar, FilterSelect, StatCard, DataTable, RowActions, Pagination, ConfirmModal, FilterChips } from "../../shared/ui";
import MonthRangeSelector from "../../shared/MonthRangeSelector";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Approved":  return "bg-green-100 text-green-800";
    case "Sent":      return "bg-blue-100 text-blue-800";
    case "Completed": return "bg-purple-100 text-purple-800";
    case "Cancelled": return "bg-red-100 text-red-800";
    default:          return "bg-gray-100 text-gray-800";
  }
};

export default function PurchaseOrderList() {
  const nav      = useNavigate();
  const dispatch = useDispatch();
  const { purchaseOrderData, isLoading } = useSelector(purchaseOrderSelector);
  const { user } = useSelector(authSelector);
  const hasWrite  = canWrite(user, Module.PurchaseOrders);
  const hasDelete = canDelete(user, Module.PurchaseOrders);

  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [pageSize,       setPageSize]       = useState(10);
  const [deleteModal,    setDeleteModal]    = useState(null);

  useEffect(() => { dispatch(fetchPurchaseOrderData()); }, [dispatch]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, currencyFilter, dateFilter, customDateRange]);

  const getDateRange = (period) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let fromDate = new Date(today);
    let toDate = new Date(today);
    switch (period) {
      case "this_month": { fromDate.setDate(1); break; }
      case "last_month": { fromDate.setMonth(fromDate.getMonth() - 1); fromDate.setDate(1); toDate.setDate(0); break; }
      case "last_3_months": { fromDate.setMonth(fromDate.getMonth() - 2); fromDate.setDate(1); break; }
      case "last_6_months": { fromDate.setMonth(fromDate.getMonth() - 5); fromDate.setDate(1); break; }
      default: return null;
    }
    return { from: fromDate, to: toDate };
  };

  const parseMonthRange = (from, to) => {
    if (!from || !to) return null;
    const fromDate = new Date(from + "-01");
    const toDate = new Date(to + "-01");
    toDate.setMonth(toDate.getMonth() + 1);
    toDate.setDate(0);
    return { from: fromDate, to: toDate };
  };

  const isInDateRange = (dateStr, fromDate, toDate) => {
    if (!dateStr || !fromDate || !toDate) return true;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return true;
    date.setHours(0, 0, 0, 0);
    return date >= fromDate && date <= toDate;
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtYM = (ym) => { if (!ym) return ""; const [y, m] = ym.split("-"); return `${MONTHS[+m-1]} ${y}`; };
  const dateFilterLabel = { this_month: "Current Month", last_month: "Previous Month", last_3_months: "Last 3 Months", last_6_months: "Last 6 Months" };

  const dateRangeObj = dateFilter === "custom" ? parseMonthRange(customDateRange.from, customDateRange.to) : getDateRange(dateFilter);

  const chips = [
    statusFilter !== "All" && { key: "status", label: `Status: ${statusFilter}` },
    currencyFilter !== "All" && { key: "currency", label: `Currency: ${currencyFilter}` },
    dateFilter !== "all" && { key: "date", label: dateFilter === "custom" && customDateRange.from && customDateRange.to ? `${fmtYM(customDateRange.from)} → ${fmtYM(customDateRange.to)}` : dateFilterLabel[dateFilter] },
  ].filter(Boolean);

  const removeChip = (key) => {
    if (key === "status") setStatusFilter("All");
    if (key === "currency") setCurrencyFilter("All");
    if (key === "date") { setDateFilter("all"); setCustomDateRange({ from: "", to: "" }); }
    setCurrentPage(1);
  };

  const purchaseOrders = Array.isArray(purchaseOrderData) ? purchaseOrderData : [];

  const filtered = purchaseOrders.filter((po) => {
    const matchSearch = (po.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) || (po.vendor_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || po.status === statusFilter;
    const cur = po.currency_type || "INR";
    const matchCurrency = currencyFilter === "All" || (currencyFilter === "Others" ? !["INR", "USD", "EUR"].includes(cur) : cur === currencyFilter);
    const matchDate = dateRangeObj ? isInDateRange(po.po_date, dateRangeObj.from, dateRangeObj.to) : true;
    return matchSearch && matchStatus && matchCurrency && matchDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current    = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const countByStatus = (s) => purchaseOrders.filter((po) => po.status === s).length;

  const handleDelete = async () => {
    if (!deleteModal?.id) return;
    try {
      await dispatch(deletePurchaseOrder(deleteModal.id));
      setDeleteModal(null);
    } catch (e) { console.error(e); }
  };

  const columns = [
    {
      label: "PO Number",
      render: (po) => {
        const id = po._id?.$oid || po.id;
        return <span className="text-blue-600 font-medium cursor-pointer" onClick={() => nav(`/purchases/editPurchaseOrder/${id}`)}>{po.po_number}</span>;
      },
    },
    { label: "Vendor",   render: (po) => <span className="text-gray-600">{po.vendor_name}</span> },
    { label: "PO Date",  hidden: true, render: (po) => <span className="text-gray-600">{formatDate(po.po_date)}</span> },
    { label: "Due Date", hidden: true, render: (po) => <span className="text-gray-600">{formatDate(po.po_dueDate)}</span> },
    {
      label: "Amount",
      render: (po) => <span className="font-semibold">{getCurrencySymbol(po.currency_type)} {Number(po.total || 0).toLocaleString()}</span>,
    },
    {
      label: "Status",
      render: (po) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>{po.status}</span>
      ),
    },
    {
      label: "Actions",
      right: true,
      stopPropagation: true,
      render: (po) => {
        const id = po._id?.$oid || po.id;
        return (
          <RowActions
            onEdit={() => hasWrite && nav(`/purchases/editPurchaseOrder/${id}`)}
            onDelete={() => hasDelete && setDeleteModal({ id, no: po.po_number || "this purchase order" })}
            canEdit={hasWrite} canDelete={hasDelete}
          />
        );
      },
    },
  ];

  return (
    <div className=" lg:w-ful w-fulll md:w-full">
      <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by PO number or vendor...">
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Sent">Sent</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </FilterSelect>
        <FilterSelect value={currencyFilter} onChange={(v) => { setCurrencyFilter(v); setCurrentPage(1); }}>
          <option value="All">All Currency</option>
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="Others">Others</option>
        </FilterSelect>
        <div className="relative">
          <FilterSelect value={dateFilter} onChange={(v) => { setDateFilter(v); setCurrentPage(1); if (v !== "custom") setDateDropdownOpen(false); else setDateDropdownOpen(true); }}>
            <option value="all">All Time</option>
            <option value="this_month">Current Month</option>
            <option value="last_month">Previous Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="custom">Custom</option>
          </FilterSelect>
          {dateFilter === "custom" && dateDropdownOpen && (
            <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
              <MonthRangeSelector
                from={customDateRange.from}
                to={customDateRange.to}
                onChange={(range) => { setCustomDateRange(range); setCurrentPage(1); }}
                onComplete={() => setDateDropdownOpen(false)}
              />
            </div>
          )}
        </div>
        <button
          onClick={() => nav("/purchases/addPurchaseOrder")}
          disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
        </button>
      </TabActionBar>

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-3">
        <StatCard label="Total Purchase Orders" value={purchaseOrders.length} />
        <StatCard label="Approved" value={countByStatus("Approved")} valueClass="text-green-600" />
        <StatCard label="Sent"     value={countByStatus("Sent")}     valueClass="text-blue-600" />
        <StatCard label="Draft"    value={countByStatus("Draft")}    valueClass="text-gray-600" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={current}
        rowKey={(po) => po._id?.$oid || po.id}
        columns={columns}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {deleteModal && (
        <ConfirmModal
          message={<>Delete purchase order <span className="font-medium">{deleteModal.no}</span>?</>}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
