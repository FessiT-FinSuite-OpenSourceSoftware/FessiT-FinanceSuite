import React, { useEffect, useState, useCallback } from "react";
import { Plus, Eye, Download, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDeliveryChallans, deleteDeliveryChallan, updateDeliveryChallan, deliveryChallanSelector } from "../../ReduxApi/deliveryChallan";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { TabActionBar, FilterSelect, StatCard, DataTable, RowActions, Pagination, ConfirmModal } from "../../shared/ui";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";

const getId = (dc) => dc?._id?.$oid || dc?._id || dc?.id || "";

const statusColor = (s) => {
  if (s === "Delivered")  return "bg-green-100 text-green-700";
  if (s === "Dispatched") return "bg-blue-100 text-blue-700";
  if (s === "Cancelled")  return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const formatDate = (v) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }); }
  catch { return v; }
};

export default function DeliveryChallans() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { data, total, isLoading } = useSelector(deliveryChallanSelector);
  const { user } = useSelector(authSelector);
  const hasWrite  = canWrite(user, Module.Invoice);
  const hasDelete = canDelete(user, Module.Invoice);

  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [deleteModal, setDeleteModal]   = useState(null);
  const [statusModal, setStatusModal]   = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [previewModal, setPreviewModal] = useState({ open: false, src: "", title: "", isPdf: false });
  const [replaceModal, setReplaceModal] = useState(null); // { id, key, label }

  const openFile = async (filename, title) => {
    try {
      const res = await axiosInstance.get(`/delivery-challan-files/${filename}`, { responseType: "blob" });
      const isPdf = filename.toLowerCase().endsWith(".pdf");
      const src = URL.createObjectURL(new Blob([res.data], { type: isPdf ? "application/pdf" : res.data.type }));
      setPreviewModal({ open: true, src, title, isPdf });
    } catch { toast.error("Unable to open file"); }
  };

  const downloadFile = async (filename, title) => {
    try {
      const res = await axiosInstance.get(`/delivery-challan-files/${filename}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Unable to download file"); }
  };

  const handleReplaceFile = async (e, id, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dc = challans.find((c) => getId(c) === id);
    if (!dc) return;
    const files = { [key]: file };
    try {
      await dispatch(updateDeliveryChallan(id, { ...dc, items: dc.items || [] }, files));
      load();
    } catch { /* toast handled in redux */ }
    setReplaceModal(null);
  };

  // debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    dispatch(fetchDeliveryChallans({ page, pageSize, search: debouncedSearch, status: statusFilter }));
  }, [dispatch, page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, pageSize]);

  const challans = Array.isArray(data) ? data : [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = [
    {
      label: "Challan No",
      render: (dc) => (
        <span className="text-blue-600 font-medium cursor-pointer text-sm" onClick={() => nav(`/delivery-challans/edit/${getId(dc)}`)}>
          {dc.challan_no || "—"}
        </span>
      ),
    },
    { label: "Date",       render: (dc) => <span className="text-sm text-gray-600">{formatDate(dc.challan_date)}</span> },
    { label: "Consignee",  render: (dc) => <span className="text-sm text-gray-700">{dc.consignee_name || "—"}</span> },
    { label: "Invoice Ref",hidden: true, render: (dc) => <span className="text-sm text-gray-500">{dc.invoice_ref || "—"}</span> },
    { label: "Purpose",    hidden: true, render: (dc) => <span className="text-sm text-gray-500">{dc.purpose || "—"}</span> },
    {
      label: "Status",
      render: (dc) => (
        <span
          onClick={() => { if (!hasWrite) return; setSelectedStatus(dc.status || "Draft"); setStatusModal({ id: getId(dc), challan_no: dc.challan_no }); }}
          className={`inline-flex items-center justify-center w-24 px-2 py-0.5 text-xs font-semibold rounded-full ${hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"} ${statusColor(dc.status || "Draft")}`}
        >
          {dc.status || "Draft"}
        </span>
      ),
    },
    {
      label: "Actions",
      right: true,
      stopPropagation: true,
      render: (dc) => {
        const id = getId(dc);
        return (
          <RowActions
            onEdit={() => hasWrite && nav(`/delivery-challans/edit/${id}`)}
            onDelete={() => hasDelete && setDeleteModal({ id, no: dc.challan_no })}
            canEdit={hasWrite} canDelete={hasDelete}
          />
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl lg:w-full">
      <TabActionBar
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchPlaceholder="Search by challan no or consignee..."
      >
        <FilterSelect value={statusFilter} onChange={(v) => setStatus(v)}>
          <option value="All">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </FilterSelect>
        {hasWrite && (
          <button onClick={() => nav("/delivery-challans/create")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
          </button>
        )}
      </TabActionBar>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {/* <StatCard label="Total (this page)" value={challans.length} /> */}
        <StatCard label="Total Records"     value={total} />
        {/* <StatCard label="Page"              value={`${page} / ${totalPages}`} valueClass="text-blue-600" /> */}
        {/* <StatCard label="Page Size"         value={pageSize} valueClass="text-gray-500" /> */}
      </div>

      <DataTable isLoading={isLoading} data={challans} rowKey={getId} columns={columns}
        renderExpanded={(dc) => {
          const id = getId(dc);
          return (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Documents</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "dispatched_copy",   label: "Dispatched Copy" },
                  { key: "acknowledged_copy", label: "Acknowledged Copy" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-[220px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
                      <p className={`text-xs font-medium ${dc[key] ? "text-green-600" : "text-slate-400"}`}>
                        {dc[key] ? "Available" : "Not uploaded"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button title="View" disabled={!dc[key]}
                        onClick={(e) => { e.stopPropagation(); dc[key] && openFile(dc[key], label); }}
                        className={`p-1.5 rounded-lg border transition-colors ${ dc[key] ? "border-slate-300 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300" : "border-slate-200 text-slate-300 cursor-not-allowed" }`}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button title="Download" disabled={!dc[key]}
                        onClick={(e) => { e.stopPropagation(); dc[key] && downloadFile(dc[key], label); }}
                        className={`p-1.5 rounded-lg border transition-colors ${ dc[key] ? "border-slate-300 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-300" : "border-slate-200 text-slate-300 cursor-not-allowed" }`}>
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {hasWrite && (
                        <>
                          <input type="file" id={`${key}-${id}`} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => { e.stopPropagation(); handleReplaceFile(e, id, key); }} />
                          <label htmlFor={`${key}-${id}`} title={dc[key] ? "Replace" : "Upload"}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => setPageSize(n)}
      />

      {deleteModal && (
        <ConfirmModal
          message={<>Delete challan <span className="font-medium">{deleteModal.no}</span>?</>}
          onConfirm={() => { dispatch(deleteDeliveryChallan(deleteModal.id)).then(load); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Update Status</h3>
            <p className="text-xs text-gray-500 mb-4">Challan: <span className="font-medium text-gray-700">{statusModal.challan_no}</span></p>
            <div className="flex flex-col gap-2">
              {["Draft", "Dispatched", "Delivered", "Cancelled"].map((s) => (
                <label key={s} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedStatus === s ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}>
                  <input type="radio" name="challan_status" value={s} checked={selectedStatus === s}
                    onChange={() => setSelectedStatus(s)} className="w-4 h-4 accent-blue-600" />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(s)}`}>{s}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusModal(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  const dc = challans.find((c) => getId(c) === statusModal.id);
                  if (dc) dispatch(updateDeliveryChallan(statusModal.id, { ...dc, status: selectedStatus })).then(load);
                  setStatusModal(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >Update</button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/75 p-4" onClick={() => setPreviewModal({ open: false, src: "", title: "", isPdf: false })}>
          <div className="max-w-5xl w-full rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">{previewModal.title}</h3>
              <div className="flex items-center gap-2">
                <button type="button" title="Download"
                  onClick={() => { const a = document.createElement("a"); a.href = previewModal.src; a.download = previewModal.title; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <Download className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setPreviewModal({ open: false, src: "", title: "", isPdf: false })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              {previewModal.isPdf
                ? <iframe src={previewModal.src} title={previewModal.title} className="w-full rounded-xl" style={{ height: "75vh" }} />
                : <img src={previewModal.src} alt={previewModal.title} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
