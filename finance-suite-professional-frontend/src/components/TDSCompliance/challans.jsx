import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Plus, Eye, Download, X, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { sanitizeDownloadFileName, showDownloadNotification, isTauri, saveBytesToDownloads } from "../../utils/pdfUtils";
import {
  challanSelector,
  createChallan,
  deleteChallan,
  fetchChallans,
  updateChallan,
} from "../../ReduxApi/challan";
import axiosInstance from "../../utils/axiosInstance";
import {
  StatCard,
  TabActionBar,
  CreateButton,
  RowActions,
  ConfirmModal,
  Modal,
  FormField,
  Pagination,
  TdsSectionSelect,
  InfoCard,
  DataTable,
  ComboField,
  inputCls,
} from "../../shared/ui";
import { TDS_FLAT_LIST } from "../../utils/tdsData";
import { toast } from "react-toastify";

const CHALLAN_FILE_FIELD = "file";
const PAYMENT_MODES = [ "NEFT/RTGS", "Cheque", "Cash", "UPI"];

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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const emptyChallan = () => ({
  challan_no: "",
  tds_sections: [],
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

const SAFE_FILENAME_RE = /^[a-zA-Z0-9_\-\.]+$/;

const isSafeFilename = (filename) => SAFE_FILENAME_RE.test(filename);

const getId = (row) => row?._id?.$oid || row?._id || row?.id || "";
const getFilename = (row) => row?.file || row?.file_name || row?.challan_file || row?.document || "";

const formatAmount = (value) => {
  const amount = parseFloat(value) || 0;
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
};

const formatTdsSections = (tdsSections) => {
  if (!Array.isArray(tdsSections) || tdsSections.length === 0) return "-";
  return tdsSections
    .map((section) => {
      const oldCode = section.section_old || section.key;
      if (section.section_new && section.section_new !== oldCode) {
        return `${oldCode} → ${section.section_new}`;
      }
      return oldCode;
    })
    .join(", ");
};

export default function ChallansTab() {
  const dispatch = useDispatch();
  const { challanData, isLoading } = useSelector(challanSelector);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyChallan());
  const [search, setSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
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

  useEffect(() => {
    dispatch(fetchChallans());
  }, [dispatch]);

  const closePreview = () => setPreviewModal({ open: false, src: "", title: "", isPdf: false });

  const openCreate = () => {
    setForm(emptyChallan());
    setDocFile(null);
    setDocFileName("");
    setModal({ mode: "create" });
  };

  const openEdit = (row) => {
    const filename = getFilename(row);
    setForm({
      challan_no: row.challan_no || row.challanNo || "",
      tds_sections: Array.isArray(row.tds_sections) ? row.tds_sections : [],
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
    if (!isSafeFilename(filename)) { toast.error("Invalid file name"); return; }
    try {
      const res = await axiosInstance.get(`/challan-files/${encodeURIComponent(filename)}`, { responseType: "blob" });
      const ext = filename.split(".").pop().toLowerCase();
      const isPdf = ext === "pdf";
      const mimeType = isPdf ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      setPreviewModal({ open: true, src: blobUrl, title: filename, isPdf });
    } catch {
      toast.error("Unable to open challan file");
    }
  };

  const handleDownloadDoc = async (filename) => {
    if (!filename) return;
    if (!isSafeFilename(filename)) { toast.error("Invalid file name"); return; }
    try {
      const safeFilename = sanitizeDownloadFileName(filename);
      let filePath = null;
      if (isTauri()) {
        const res = await axiosInstance.get(`/challan-files/${encodeURIComponent(filename)}`, { responseType: "arraybuffer" });
        const saved = await saveBytesToDownloads(new Uint8Array(res.data), safeFilename);
        filePath = saved.filePath;
      } else {
        const res = await axiosInstance.get(`/challan-files/${encodeURIComponent(filename)}`, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = safeFilename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
      showDownloadNotification(safeFilename, filePath);
    } catch {
      toast.error("Unable to download challan file");
    }
  };

  const handlePreviewDownload = async () => {
    if (!previewModal.src || !previewModal.src.startsWith("blob:")) return;
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
        a.href = previewModal.src;
        a.download = safeFilename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
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
      Object.entries({
        challan_no: form.challan_no,
        tds_sections: JSON.stringify(form.tds_sections),
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
      if (docFile) payload.append(CHALLAN_FILE_FIELD, docFile);

      if (modal.mode === "create") {
        await dispatch(createChallan(payload));
      } else {
        await dispatch(updateChallan(modal.id, payload));
      }
      closeModal();
    } catch {
      toast.error("Failed to save challan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!deleteModal?.id) return;
    dispatch(deleteChallan(deleteModal.id));
    setDeleteModal(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sq = sectionSearch.trim().toLowerCase();
    return (Array.isArray(challanData) ? challanData : []).filter((row) => {
      const section = row.section || "";
      const challanNo = row.challan_no || row.challanNo || "";
      const paymentDate = row.payment_date || "";
      const matchesSearch =
        !q ||
        challanNo.toLowerCase().includes(q) ||
        section.toLowerCase().includes(q) ||
        paymentDate.toLowerCase().includes(q);
      const matchesSection =
        !sq ||
        (row.tds_sections || []).some(
          (s) =>
            (s.key || "").toLowerCase().includes(sq) ||
            (s.section_old || "").toLowerCase().includes(sq) ||
            (s.section_new || "").toLowerCase().includes(sq)
        ) ||
        section.toLowerCase().includes(sq);
      return matchesSearch && matchesSection;
    });
  }, [challanData, search, sectionSearch]);

  const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row.amount_paid) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full">
      <TabActionBar
        sticky={false}
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
        searchPlaceholder="Search by challan no, section, or payment date..."
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={sectionSearch}
            onChange={(e) => { setSectionSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search section code..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
          />
        </div>
        <CreateButton onClick={openCreate} label="Add Challan" icon={Plus} />
      </TabActionBar>

      {(search || sectionSearch) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
          {search && (
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200 transition"
            >
              Search: {search}
              <span className="text-sm">×</span>
            </button>
          )}

          {sectionSearch && (
            <button
              onClick={() => setSectionSearch("")}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition"
            >
              Section: {sectionSearch}
              <span className="text-sm">×</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Amount" value={formatAmount(totalAmount)} valueClass="text-indigo-700" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={paginated}
        rowKey={(row) => getId(row) || row.challan_no || row.challanNo}
        wrapperClass="bg-white rounded-lg shadow-sm overflow-hidden"
        emptyMessage="No challans found."
        columns={[
          {
            label: "Challan No",
            render: (row) => <span className="font-medium text-gray-900 whitespace-nowrap">{row.challan_no || row.challanNo || "-"}</span>,
          },
          {
            label: "Section",
            render: (row) => {
              const sections = Array.isArray(row.tds_sections) ? row.tds_sections : [];
              if (!sections.length) return <span className="text-gray-400 text-xs">-</span>;
              return (
                <div className="flex flex-wrap gap-1">
                  {sections.map((s, i) => (
                    <span key={i} className="font-semibold text-blue-700 text-xs bg-blue-50 px-1.5 py-0.5 rounded">{s.key ||s.section_new || s.section_old }</span>
                  ))}
                </div>
              );
            },
          },
          {
            label: "Payment Date",
            render: (row) => <span className="text-gray-600 whitespace-nowrap">{formatDate(row.payment_date)}</span>,
          },
          {
            label: "Amount Paid",
            render: (row) => <span className="font-semibold text-gray-900 whitespace-nowrap">{formatAmount(row.amount_paid)}</span>,
          },
          {
            label: "Tax Year",
            render: (row) => (
              <div className="whitespace-nowrap">
                <p className="text-gray-600 text-sm">{row.tax_year || "-"}</p>
                {/* {row.period && <p className="text-xs text-indigo-500 font-medium">{row.period}</p>} */}
              </div>
            ),
          },
          {
            label: "File", right: true, stopPropagation: true,
            render: (row) => {
              const filename = getFilename(row);
              return filename ? (
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => handleViewDoc(filename)} className="text-blue-600 hover:text-blue-800">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDownloadDoc(filename)} className="text-blue-600 hover:text-blue-800">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : <span className="text-gray-400 text-xs flex justify-end">-</span>;
            },
          },
          {
            label: "Actions", right: true, stopPropagation: true,
            render: (row) => {
              const id = getId(row);
              const challanNo = row.challan_no || row.challanNo || "-";
              return <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteModal({ id, no: challanNo })} />;
            },
          },
        ]}
        renderExpanded={(row) => (
          <div className="px-4 py-4 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {/* <InfoCard label="Challan No" value={row.challan_no || row.challanNo || "-"} /> */}
              <InfoCard label="TDS Sections" value={formatTdsSections(row.tds_sections)} className="xl:col-span-2" />
              <InfoCard label="Nature of Payment" value={(row.tds_sections || []).map((s) => s.nature).filter(Boolean).join("; ") || "-"} className="xl:col-span-2" />
              {/* <InfoCard label="Period" value={row.period || "-"} /> */}
              <InfoCard label="Mode of Payment" value={row.mode_of_payment || "-"} />
              <InfoCard label="Type of Challan" value={row.payment_type || "-"} />
              <InfoCard label="Bank Reference No" value={row.bank_reference_no || "-"} />
              {row.notes && <InfoCard label="Notes" value={row.notes} className="xl:col-span-2" />}
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
        onPageSizeChange={(value) => { setPageSize(value); setCurrentPage(1); }}
      />

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Add Challan" : "Edit Challan"}
          onClose={closeModal}
          onSave={handleSave}
          saveLabel={saving ? "Saving..." : "Save"}
          size="lg"
        >
          <FormField label="Challan Number">
            <input
              type="text"
              name="challan_no"
              value={form.challan_no}
              onChange={handleChange}
              className={inputCls}
              placeholder="Enter challan number"
            />
          </FormField>
          <FormField label="Type of Challan">
            <input
              type="text"
              name="payment_type"
              value={form.payment_type}
              onChange={handleChange}
              className={inputCls}
              placeholder="e.g. TDS/TCS payable by taxpayer"
            />
          </FormField>
         
          <FormField label="TDS Sections" colSpan>
            <div className="space-y-2">
              {(form.tds_sections || []).map((sec, idx) => {
                const s = TDS_FLAT_LIST.find((x) => x.code === sec.key);
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <TdsSectionSelect
                        value={sec.key}
                        onChange={(key, rate, section) =>
                          setForm((prev) => {
                            const updated = [...prev.tds_sections];
                            updated[idx] = { key, section_new: section?.newSection || "", section_old: section?.oldSection || "", nature: section?.nature || "" };
                            return { ...prev, tds_sections: updated };
                          })
                        }
                        inputCls={inputCls}
                      />
                      {s && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{s.code}</span>
                          <span className="text-xs font-semibold text-blue-700">{s.newSection}</span>
                          <span className="text-xs text-gray-400">({s.oldSection})</span>
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{s.rate}</span>
                          <span className="text-xs text-gray-400 truncate max-w-[220px]" title={s.nature}>{s.nature}</span>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, tds_sections: prev.tds_sections.filter((_, i) => i !== idx) }))}
                      className="mt-2 text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button type="button"
                onClick={() => setForm((prev) => ({ ...prev, tds_sections: [...prev.tds_sections, { key: "", section_new: "", section_old: "", nature: "" }] }))}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add TDS Section
              </button>
            </div>
          </FormField>
          <FormField label="Financial Year">
            <ComboField
              name="tax_year"
              value={form.tax_year}
              onChange={handleChange}
              options={getFYOptions()}
              placeholder="e.g. 2019-20"
              otherLabel="Custom..."
            />
          </FormField>
          {/* <FormField label="Period (Month)">
            <input
              type="month"
              name="period"
              value={form.period}
              onChange={handleChange}
              className={inputCls}
            />
          </FormField> */}
           <FormField label="Payment Date">
            <input
              type="date"
              name="payment_date"
              value={form.payment_date}
              onChange={handleChange}
              className={inputCls}
            />
          </FormField>
          <FormField label="Amount Paid">
            <input
              type="number"
              name="amount_paid"
              value={form.amount_paid}
              onChange={handleChange}
              className={inputCls}
              placeholder="0.00"
              min="0"
            />
          </FormField>
          
          <FormField label="Mode of Payment">
            <ComboField
              name="mode_of_payment"
              value={form.mode_of_payment}
              onChange={handleChange}
              options={PAYMENT_MODES}
              placeholder="Enter payment mode"
            />
          </FormField>
          
          <FormField label="Payment Reference Number">
            <input
              type="text"
              name="bank_reference_no"
              value={form.bank_reference_no}
              onChange={handleChange}
              className={inputCls}
              placeholder="Enter payment reference number"
            />
          </FormField>
          <FormField label="Notes" colSpan>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className={inputCls}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
          <FormField label="Challan File *" colSpan>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="challanFileUpload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
              />
              <label
                htmlFor="challanFileUpload"
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
              >
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
          message={<>Delete challan <span className="font-medium">{deleteModal.no}</span>?</>}
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
                <button type="button" onClick={handlePreviewDownload} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Download">
                  <Download className="h-5 w-5" />
                </button>
                <button type="button" onClick={closePreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              {previewModal.isPdf ? (
                <iframe src={`${previewModal.src}#toolbar=0`} title={previewModal.title} className="w-full rounded-xl" style={{ height: "75vh" }} />
              ) : (
                <img src={previewModal.src} alt={previewModal.title} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
