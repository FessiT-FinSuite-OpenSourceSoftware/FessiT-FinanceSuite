import React, { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  estimateSelector,
  fetchEstimates,
  deleteEstimate,
  updateEstimateStatus,
} from "../../ReduxApi/estimate";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import {
  StatCard,
  TabActionBar,
  FilterSelect,
  CreateButton,
  DataTable,
  RowActions,
  Pagination,
  ConfirmModal,
  Modal,
  FormField,
  inputCls,
  FilterChips,
} from "../../shared/ui";
import MonthRangeSelector from "../../shared/MonthRangeSelector";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "expired", "converted"];

const cap = (s) => (s || "draft").charAt(0).toUpperCase() + (s || "draft").slice(1);

const statusColor = (s) => {
  switch ((s || "").toLowerCase()) {
    case "draft":     return "bg-gray-100 text-gray-700";
    case "sent":      return "bg-blue-100 text-blue-700";
    case "accepted":  return "bg-green-100 text-green-700";
    case "rejected":  return "bg-red-100 text-red-700";
    case "expired":   return "bg-orange-100 text-orange-700";
    case "converted": return "bg-purple-100 text-purple-700";
    default:          return "bg-gray-100 text-gray-700";
  }
};

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};

const getId = (row) =>
  row?._id?.$oid || (typeof row?._id === "string" ? row._id : "") ||
  row?.id?.$oid  || (typeof row?.id  === "string" ? row.id  : "") || "";

export default function EstimateList() {
  const dispatch  = useDispatch();
  const nav       = useNavigate();
  const { estimateData, isLoading, total } = useSelector(estimateSelector);
  const { user }  = useSelector(authSelector);
  const hasWrite  = canWrite(user, Module.Invoice);
  const hasDelete = canDelete(user, Module.Invoice);

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter]     = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);
  const [statusPopup, setStatusPopup]   = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);

  const doFetch = useCallback(() => {
    const params = { page: currentPage, limit: pageSize };
    if (search.trim())          params.search = search.trim();
    if (statusFilter !== "All") params.status = statusFilter;
    if (dateFilter === "custom" && customDateRange.from && customDateRange.to) {
      params.from = customDateRange.from;
      params.to = customDateRange.to;
    }
    dispatch(fetchEstimates(params));
  }, [dispatch, currentPage, pageSize, search, statusFilter, dateFilter, customDateRange]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateFilter, customDateRange, pageSize]);
  useEffect(() => { doFetch(); }, [doFetch]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtYM = (ym) => { if (!ym) return ""; const [y, m] = ym.split("-"); return `${MONTHS[+m-1]} ${y}`; };
  const dateFilterLabel = { this_month: "Current Month", last_month: "Previous Month", last_3_months: "Last 3 Months", last_6_months: "Last 6 Months" };

  const chips = [
    statusFilter !== "All" && { key: "status", label: `Status: ${cap(statusFilter)}` },
    dateFilter !== "all" && { key: "date", label: dateFilter === "custom" && customDateRange.from && customDateRange.to ? `${fmtYM(customDateRange.from)} → ${fmtYM(customDateRange.to)}` : dateFilterLabel[dateFilter] },
  ].filter(Boolean);

  const removeChip = (key) => {
    if (key === "status") setStatusFilter("All");
    if (key === "date") { setDateFilter("all"); setCustomDateRange({ from: "", to: "" }); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allData = Array.isArray(estimateData) ? estimateData : [];
  const totalValue   = allData.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const acceptedAmt  = allData.filter((r) => (r.status || "").toLowerCase() === "accepted").reduce((s, r) => s + (Number(r.total) || 0), 0);
  const acceptedCount = allData.filter((r) => (r.status || "").toLowerCase() === "accepted").length;
  const convertedCount = allData.filter((r) => (r.status || "").toLowerCase() === "converted").length;

  const handleDelete = () => {
    if (!deleteModal?.id) return;
    dispatch(deleteEstimate(deleteModal.id));
    setDeleteModal(null);
  };

  const handleStatusSave = () => {
    dispatch(updateEstimateStatus(statusPopup.id, statusPopup.status));
    setStatusPopup(null);
  };

  const columns = [
    {
      label: "Estimate No",
      render: (row) => {
        const id = getId(row);
        return (
          <span className="font-medium text-blue-600 cursor-pointer" onClick={() => hasWrite && nav(`/estimates/edit/${id}`)}>
            {row.estimateNumber || "-"}
          </span>
        );
      },
    },
    {
      label: "Customer",
      render: (row) => (
        <span className="block truncate max-w-40 text-gray-600" title={row.customerName || "-"}>
          {row.customerName || "-"}
        </span>
      ),
    },
    { label: "Issue Date",  render: (row) => <span className="text-gray-600">{formatDate(row.issueDate)}</span> },
    { label: "Expiry Date", render: (row) => <span className="text-gray-600">{formatDate(row.expiryDate)}</span> },
    { label: "Total",       render: (row) => <span className="font-semibold text-gray-900">{fmt(row.total)}</span> },
    {
      label: "Status",
      render: (row) => {
        const id     = getId(row);
        const locked = (row.status || "").toLowerCase() === "converted";
        return (
          <span
            onClick={() => !locked && hasWrite && setStatusPopup({ id, status: (row.status || "draft").toLowerCase() })}
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(row.status)} ${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
          >
            {cap(row.status)}
          </span>
        );
      },
    },
    {
      label: "Actions",
      right: true,
      render: (row) => {
        const id     = getId(row);
        const locked = (row.status || "").toLowerCase() === "converted";
        return (
          <RowActions
            onEdit={() => hasWrite && nav(`/estimates/edit/${id}`)}
            onDelete={() => hasDelete && setDeleteModal({ id, no: row.estimateNumber || "this estimate" })}
            canEdit={hasWrite && !locked}
            canDelete={hasDelete && !locked}
          />
        );
      },
    },
  ];

  return (
    <div className="w-full lg:w-full md:w-full">
      <TabActionBar
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchPlaceholder="Search by estimate number..."
      >
        <FilterSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="All">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{cap(s)}</option>
          ))}
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

        <CreateButton
          onClick={() => hasWrite && nav("/estimates/create")}
          label="Create"
          icon={Plus}
        />
      </TabActionBar>

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-3">
        <StatCard label="Total Estimates" value={total} />
        <StatCard label="Total Value" value={fmt(totalValue)} valueClass="text-indigo-700" />
        <StatCard label="Accepted" value={`${acceptedCount} · ${fmt(acceptedAmt)}`} valueClass="text-green-700" />
        <StatCard label="Converted" value={convertedCount} valueClass="text-purple-700" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={allData}
        rowKey={(row) => getId(row) || row.estimateNumber}
        columns={columns}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => setPageSize(n)}
      />

      {statusPopup && (
        <Modal
          title="Update Status"
          onClose={() => setStatusPopup(null)}
          onSave={handleStatusSave}
          saveLabel="Update"
        >
          <FormField label="Status" colSpan>
            <select
              value={statusPopup.status}
              onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value }))}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{cap(s)}</option>
              ))}
            </select>
          </FormField>
        </Modal>
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete quotation <span className="font-medium">{deleteModal.no}</span>?</>}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
