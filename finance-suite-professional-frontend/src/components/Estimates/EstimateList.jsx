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
} from "../../shared/ui";

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
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);
  const [statusPopup, setStatusPopup]   = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);

  const doFetch = useCallback(() => {
    const params = { page: currentPage, limit: pageSize };
    if (search.trim())          params.search = search.trim();
    if (statusFilter !== "All") params.status = statusFilter;
    if (fromDate)               params.from   = fromDate;
    if (toDate)                 params.to     = toDate;
    dispatch(fetchEstimates(params));
  }, [dispatch, currentPage, pageSize, search, statusFilter, fromDate, toDate]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, fromDate, toDate, pageSize]);
  useEffect(() => { doFetch(); }, [doFetch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allData = Array.isArray(estimateData) ? estimateData : [];
  const stats = {
    total,
    totalValue: allData.filter(r => r.status !== "converted").reduce((s, r) => s + (Number(r.total) || 0), 0),
    accepted:   allData.filter((r) => (r.status || "").toLowerCase() === "accepted").length,
  };

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
    <div className="max-w-7xl lg:w-full md:w-full">
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

        <CreateButton
          onClick={() => hasWrite && nav("/estimates/create")}
          label="Create"
          icon={Plus}
        />
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Estimates" value={stats.total} />
        <StatCard label="Total Value" value={fmt(stats.totalValue)} valueClass="text-indigo-700" />
        <StatCard label="Accepted" value={stats.accepted} valueClass="text-green-700" />
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
