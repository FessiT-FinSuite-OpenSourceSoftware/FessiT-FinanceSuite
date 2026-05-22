import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Plus, Eye, Download, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { sanitizeDownloadFileName, showDownloadNotification, isTauri, saveBytesToDownloads } from "../../utils/pdfUtils";
import { ptChallanSelector, createPtChallan, deletePtChallan, fetchPtChallans, updatePtChallan } from "../../ReduxApi/ptChallan";
import axiosInstance from "../../utils/axiosInstance";
import {
  StatCard, TabActionBar, FilterSelect, CreateButton, RowActions, ConfirmModal,
  Modal, FormField, Pagination, TdsSectionSelect, InfoCard, DataTable, ComboField, inputCls,
} from "../../shared/ui";
import MonthRangeSelector from "../../shared/MonthRangeSelector";
import { TDS_FLAT_LIST } from "../../utils/tdsData";
import { toast } from "react-toastify";

const FILE_FIELD = "file";
const PAYMENT_MODES = ["NEFT/RTGS", "Cheque", "Cash", "UPI"];

const getCurrentFY = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const getFYOptions = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentStart = month >= 4 ? year : year - 1;
  return Array.from({ length: 6 }, (_, i) => {
    const s = currentStart - i;
    return `${s}-${String(s + 1).slice(-2)}`;
  });
};

const getCurrentPeriod = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

const emptyForm = () => ({
  challan_no: "",
  section: "",
  tds_section_key: "",
  tds_section_new: "",
  tds_section_old: "",
  tds_section_nature: "",
  payment_date: "",
  date_of_challan: "",
  amount_paid: "",
  tax_year: getCurrentFY(),
  period: getCurrentPeriod(),
  payment_type: "",
  bank_reference_no: "",
  file: "",
  mode_of_payment: "",
  notes: "",
});

const getId = (row) => row?._id?.$oid || row?._id || row?.id || "";
const getFilename = (row) => row?.file || "";
const formatAmount = (v) => `Rs. ${(parseFloat(v) || 0).toLocaleString("en-IN")}`;
const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN");
};

export default function PtChallansTab() {
  const dispatch = useDispatch();
  const { ptChallanData, isLoading } = useSelector(ptChallanSelector);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [periodRange, setPeriodRange] = useState({ from: "", to: "" });
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [docFile, setDocFile] = useState(null);
  const [docFileName, setDocFileName] = useState("");
  const [previewModal, setPreviewModal] = useState({ open: false, src: "", title: "", isPdf: false });
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    if (previewModal.open) document.body.setAttribute("data-modal-open", "1");
    else document.body.removeAttribute("data-modal-open");
    return () => document.body.removeAttribute("data-modal-open");
  }, [previewModal.open]);

  useEffect(() => { dispatch(fetchPtChallans()); }, [dispatch]);

  const closePreview = () => setPreviewModal({ open: false, src: "", title: "", isPdf: false });

  const openCreate = () => {
    setForm(emptyForm());
    setDocFile(null);
    setDocFileName("");
    setModal({ mode: "create" });
  };
  const currentPeriod = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; };

  const openEdit = (row) => {
    const filename = getFilename(row);
    setForm({
      challan_no: row.challan_no || "",
      section: row.section || "",
      tds_section_key: row.tds_section_key || "",
      tds_section_new: row.tds_section_new || "",
      tds_section_old: row.tds_section_old || "",
      tds_section_nature: row.tds_section_nature || "",
      payment_date: row.payment_date || "",
      date_of_challan: row.date_of_challan || "",
      amount_paid: row.amount_paid ?? "",
      tax_year: row.tax_year || getCurrentFY(),
      period: row.period || getCurrentPeriod(),
      payment_type: row.payment_type || "",
      bank_reference_no: row.bank_reference_no || "",
      file: filename,
      mode_of_payment: row.mode_of_payment || "",
      notes: row.notes || "",
    });
    setDocFile(null);
    setDocFileName(filename);
    setModal({ mode: "edit", id: getId(row) });
  };

  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setDocFile(file || null);
    setDocFileName(file ? file.name : "");
  };

  const handleViewDoc = async (filename) => {
    if (!filename) return;
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) { toast.error("Invalid file name"); return; }
    try {
      const res = await axiosInstance.get(`/pt-challan-files/${encodeURIComponent(filename)}`, { responseType: "blob" });
      const ext = filename.split(".").pop().toLowerCase();
      const isPdf = ext === "pdf";
      const mimeType = isPdf ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      setPreviewModal({ open: true, src: blobUrl, title: filename, isPdf });
    } catch {
      toast.error("Unable to open PT challan file");
    }
  };

  const handleDownloadDoc = async (filename) => {
    if (!filename) return;
    try {
      const safeFilename = sanitizeDownloadFileName(filename);
      let filePath = null;
      if (isTauri()) {
        const res = await axiosInstance.get(`/pt-challan-files/${filename}`, { responseType: "arraybuffer" });
        const saved = await saveBytesToDownloads(new Uint8Array(res.data), safeFilename);
        filePath = saved.filePath;
      } else {
        const res = await axiosInstance.get(`/pt-challan-files/${filename}`, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url; a.download = safeFilename; a.style.display = "none";
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
      showDownloadNotification(safeFilename, filePath);
    } catch {
      toast.error("Unable to download PT challan file");
    }
  };

  const handlePreviewDownload = async () => {
    if (!previewModal.src) return;
    const safeFilename = sanitizeDownloadFileName(previewModal.title);
    let filePath = null;
    try {
      if (isTauri()) {
        const res = await fetch(previewModal.src);
        const buffer = await res.arrayBuffer();
        const saved = await saveBytesToDownloads(new Uint8Array(buffer), safeFilename);
        filePath = saved.filePath;
      } else {
        const a = document.createElement("a");
        a.href = previewModal.src; a.download = safeFilename; a.style.display = "none";
        document.body.appendChild(a); a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      }
      showDownloadNotification(safeFilename, filePath);
    } catch {
      toast.error("Unable to download file");
    }
  };

  const handleSave = async () => {
    if (!form.challan_no.trim()) { toast.error("Challan number is required"); return; }
    if (!form.payment_date.trim()) { toast.error("Payment date is required"); return; }
    if (!form.amount_paid.toString().trim()) { toast.error("Amount paid is required"); return; }
    if (!docFile && !form.file && !docFileName) { toast.error("Challan file is required"); return; }

    setSaving(true);
    try {
      const payload = new FormData();
      const selectedSection = TDS_FLAT_LIST.find((s) => s.code === form.tds_section_key);
      Object.entries({
        challan_no: form.challan_no,
        section: selectedSection?.oldSection || form.section || "",
        tds_section_key: form.tds_section_key,
        tds_section_new: selectedSection?.newSection || form.tds_section_new || "",
        tds_section_old: selectedSection?.oldSection || form.tds_section_old || "",
        tds_section_nature: selectedSection?.nature || form.tds_section_nature || "",
        payment_date: form.payment_date,
        date_of_challan: form.date_of_challan,
        amount_paid: parseFloat(form.amount_paid) || 0,
        tax_year: form.tax_year,
        period: form.period,
        payment_type: form.payment_type,
        bank_reference_no: form.bank_reference_no,
        mode_of_payment: form.mode_of_payment,
        notes: form.notes,
      }).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, String(value));
        }
      });
      if (docFile) payload.append(FILE_FIELD, docFile);

      if (modal.mode === "create") {
        await dispatch(createPtChallan(payload));
      } else {
        await dispatch(updatePtChallan(modal.id, payload));
      }
      closeModal();
    } catch {
      toast.error("Failed to save PT challan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!deleteModal?.id) return;
    dispatch(deletePtChallan(deleteModal.id));
    setDeleteModal(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Array.isArray(ptChallanData) ? ptChallanData : []).filter((row) => {
      const matchesSearch = !q ||
        (row.challan_no || "").toLowerCase().includes(q) ||
        (row.section || "").toLowerCase().includes(q) ||
        (row.payment_date || "").toLowerCase().includes(q);
      const matchesSection = sectionFilter === "All" ||
        row.section === sectionFilter ||
        row.tds_section_old === sectionFilter;
      const matchesPeriod = (!periodRange.from && !periodRange.to) ||
        (row.period &&
          (!periodRange.from || row.period >= periodRange.from) &&
          (!periodRange.to || row.period <= periodRange.to));
      return matchesSearch && matchesSection && matchesPeriod;
    });
  }, [ptChallanData, search, sectionFilter, periodRange]);

  const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row.amount_paid) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full">
      <TabActionBar
        sticky={false}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        searchPlaceholder="Search by challan no, section, or payment date..."
      >
        {/* <FilterSelect value={sectionFilter} onChange={(v) => { setSectionFilter(v); setCurrentPage(1); }}>
          <option value="All">All Sections</option>
          {[...new Set(TDS_FLAT_LIST.map((s) => s.oldSection))].map((sec) => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </FilterSelect> */}
        <MonthRangeSelector
          from={periodRange.from}
          to={periodRange.to}
          onChange={(next) => { setPeriodRange(next); setCurrentPage(1); }}
        />
        <CreateButton onClick={openCreate} label="Add PT Challan" icon={Plus} />
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Amount" value={formatAmount(totalAmount)} valueClass="text-indigo-700" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={paginated}
        rowKey={(row) => getId(row) || row.challan_no}
        wrapperClass="bg-white rounded-lg shadow-sm overflow-hidden"
        emptyMessage="No PT challans found."
        columns={[
          { label: "Challan No", render: (row) => <span className="font-medium text-gray-900 whitespace-nowrap">{row.challan_no || "-"}</span> },
          {
            label: "Section",
            render: (row) => row.tds_section_new
              ? <span className="font-semibold text-blue-700 text-xs">{row.tds_section_key}</span>
              : <span className="text-gray-600 text-xs">{row.section || "-"}</span>,
          },
          { label: "Payment Date", render: (row) => <span className="text-gray-600 whitespace-nowrap">{formatDate(row.payment_date)}</span> },
          { label: "Amount Paid", render: (row) => <span className="font-semibold text-gray-900 whitespace-nowrap">{formatAmount(row.amount_paid)}</span> },
          { label: "Tax Year", render: (row) => (
            <div className="whitespace-nowrap">
              <p className="text-gray-600 text-sm">{row.tax_year || "-"}</p>
              {row.period && <p className="text-xs text-indigo-500 font-medium">{row.period}</p>}
            </div>
          )},
          {
            label: "File", right: true, stopPropagation: true,
            render: (row) => {
              const filename = getFilename(row);
              return filename ? (
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => handleViewDoc(filename)} className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDownloadDoc(filename)} className="text-blue-600 hover:text-blue-800"><Download className="w-4 h-4" /></button>
                </div>
              ) : <span className="text-gray-400 text-xs flex justify-end">-</span>;
            },
          },
          {
            label: "Actions", right: true, stopPropagation: true,
            render: (row) => <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteModal({ id: getId(row), no: row.challan_no || "-" })} />,
          },
        ]}
        renderExpanded={(row) => (
          <div className="px-4 py-4 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <InfoCard label="Old Section" value={row.section || row.tds_section_old || "-"} />
              <InfoCard label="New Section" value={row.tds_section_new || "-"} />
              <InfoCard label="Period" value={row.period || "-"} />
              <InfoCard label="Mode of Payment" value={row.mode_of_payment || "-"} />
              <InfoCard label="Type of Challan" value={row.payment_type || "-"} />
              <InfoCard label="Bank Reference No" value={row.bank_reference_no || "-"} />
              <InfoCard label="TDS Section Nature" value={row.tds_section_nature || "-"} className="xl:col-span-2" />
              <InfoCard label="Notes" value={row.notes || "-"} className="xl:col-span-2" />
            </div>
          </div>
        )}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(v) => { setPageSize(v); setCurrentPage(1); }}
      />

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Add PT Challan" : "Edit PT Challan"}
          onClose={closeModal}
          onSave={handleSave}
          saveLabel={saving ? "Saving..." : "Save"}
          size="lg"
        >
          <FormField label="Challan Number">
            <input type="text" name="challan_no" value={form.challan_no} onChange={handleChange} className={inputCls} placeholder="Enter challan number" />
          </FormField>
          <FormField label="Type of Challan">
            <input type="text" name="payment_type" value={form.payment_type} onChange={handleChange} className={inputCls} placeholder="e.g. Professional Tax payable" />
          </FormField>
          <FormField label="Period">
            <input type="month" name="period" value={form.period} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="TDS Section" colSpan>
            <TdsSectionSelect
              value={form.tds_section_key}
              onChange={(key, rate, section) =>
                setForm((prev) => ({
                  ...prev,
                  tds_section_key: key,
                  tds_section_new: section?.newSection || "",
                  tds_section_old: section?.oldSection || "",
                  tds_section_nature: section?.nature || "",
                  section: section?.oldSection || "",
                }))
              }
              inputCls={inputCls}
            />
            {form.tds_section_key && (() => {
              const s = TDS_FLAT_LIST.find((s) => s.code === form.tds_section_key);
              return s ? (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{s.code}</span>
                  <span className="text-xs font-semibold text-blue-700">{s.newSection}</span>
                  <span className="text-xs text-gray-400">({s.oldSection})</span>
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{s.rate}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[220px]" title={s.nature}>{s.nature}</span>
                </div>
              ) : null;
            })()}
          </FormField>
          <FormField label="Financial Year">
            <ComboField name="tax_year" value={form.tax_year} onChange={handleChange} options={getFYOptions()} placeholder="e.g. 2019-20" otherLabel="Custom..." />
          </FormField>
          <FormField label="Payment Date">
            <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="Amount Paid">
            <input type="number" name="amount_paid" value={form.amount_paid} onChange={handleChange} className={inputCls} placeholder="0.00" min="0" />
          </FormField>
          <FormField label="Mode of Payment">
            <ComboField name="mode_of_payment" value={form.mode_of_payment} onChange={handleChange} options={PAYMENT_MODES} placeholder="Enter payment mode" />
          </FormField>
          <FormField label="Payment Reference Number">
            <input type="text" name="bank_reference_no" value={form.bank_reference_no} onChange={handleChange} className={inputCls} placeholder="Enter payment reference number" />
          </FormField>
          <FormField label="Notes" colSpan>
            <textarea name="notes" value={form.notes} onChange={handleChange} className={inputCls} placeholder="Additional notes" rows={3} />
          </FormField>
          <FormField label="Challan File *" colSpan>
            <div className="flex items-center gap-3">
              <input type="file" id="ptChallanFileUpload" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileChange} />
              <label htmlFor="ptChallanFileUpload" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm">
                {form.file || docFile ? "Change File" : "Choose File"}
              </label>
              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                {docFile ? docFile.name : docFileName || form.file || "No file chosen"}
              </span>
            </div>
          </FormField>
        </Modal>
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete PT challan <span className="font-medium">{deleteModal.no}</span>?</>}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {previewModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/75 p-4" onClick={closePreview}>
          <div className="max-w-5xl w-full rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-semibold text-slate-900 truncate max-w-[80%]">{previewModal.title}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePreviewDownload} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Download"><Download className="h-5 w-5" /></button>
                <button type="button" onClick={closePreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              {previewModal.isPdf
                ? <iframe src={`${previewModal.src}#toolbar=0`} title={previewModal.title} className="w-full rounded-xl" style={{ height: "75vh" }} />
                : <img src={previewModal.src} alt={previewModal.title} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
              }
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
