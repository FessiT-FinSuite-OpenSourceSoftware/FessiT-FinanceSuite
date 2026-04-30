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
  TableWrapper,
  TableHead,
  EmptyRow,
  RowActions,
  Pagination,
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

// Handles both { $oid: "..." } and plain string _id
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

  const doFetch = useCallback(() => {
    const params = { page: currentPage, limit: pageSize };
    if (search.trim())          params.search = search.trim();
    if (statusFilter !== "All") params.status = statusFilter;
    if (fromDate)               params.from   = fromDate;
    if (toDate)                 params.to     = toDate;
    dispatch(fetchEstimates(params));
  }, [dispatch, currentPage, pageSize, search, statusFilter, fromDate, toDate]);

  // Reset to page 1 when filters change (not when page itself changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fromDate, toDate, pageSize]);

  // Fetch whenever page or filters change
  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Derive stats from current estimateData (all records already fetched)
  const allData = Array.isArray(estimateData) ? estimateData : [];
  const stats = {
    total,
    totalValue: allData.filter(r => r.status !== "converted").reduce((s, r) => s + (Number(r.total) || 0), 0),
    accepted:   allData.filter((r) => (r.status || "").toLowerCase() === "accepted").length,
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this estimate?")) return;
    dispatch(deleteEstimate(id));
  };

  const handleStatusSave = () => {
    dispatch(updateEstimateStatus(statusPopup.id, statusPopup.status));
    setStatusPopup(null);
  };

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

        {/* <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          title="From date"
        />
        <label className="text-sm text-gray-600">-</label>

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          title="To date"
        /> */}

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

      <TableWrapper>
        <TableHead columns={[
          { label: "Estimate No" },
          { label: "Customer" },
          { label: "Issue Date" },
          { label: "Expiry Date" },
          { label: "Total" },
          { label: "Status" },
          { label: "Actions", right: true },
        ]} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={7} message="Loading estimates..." />
          ) : allData.length === 0 ? (
            <EmptyRow colSpan={7} message="No estimates found." />
          ) : allData.map((row) => {
            const id     = getId(row);
            const locked = (row.status || "").toLowerCase() === "converted";
            return (
              <tr key={id || row.estimateNumber} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap font-medium text-blue-600 cursor-pointer" onClick={() => hasWrite && nav(`/estimates/edit/${id}`)}>
                  {row.estimateNumber || "-"}
                </td>
                <td className="px-4 py-2 text-gray-600 max-w-[160px]">
                  <span className="block truncate" title={row.customerName || "-"}>{row.customerName || "-"}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDate(row.issueDate)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDate(row.expiryDate)}</td>
                <td className="px-4 py-2 whitespace-nowrap font-semibold text-gray-900">{fmt(row.total)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    onClick={() => !locked && hasWrite && setStatusPopup({ id, status: (row.status || "draft").toLowerCase() })}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(row.status)} ${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
                  >
                    {cap(row.status)}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right">
                  <RowActions
                    onEdit={() => hasWrite && nav(`/estimates/edit/${id}`)}
                    onDelete={() => hasDelete && handleDelete(id)}
                    canEdit={hasWrite && !locked}
                    canDelete={hasDelete && !locked}
                  />
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
    </div>
  );
}
