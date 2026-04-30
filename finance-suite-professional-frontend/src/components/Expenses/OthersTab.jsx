import React, { useState, useEffect, useCallback } from "react";
import { Plus, Eye, Download } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useDispatch, useSelector } from "react-redux";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { fetchGeneralExpenses, createGeneralExpense, updateGeneralExpense, deleteGeneralExpense, uploadGeneralExpenseFile, generalExpenseSelector } from "../../ReduxApi/generalExpense";
import { authSelector } from "../../ReduxApi/auth";
import { StatCard, TabActionBar, FilterSelect, CreateButton, TableWrapper, TableHead, EmptyRow, RowActions, Modal, FormField, inputCls, Pagination } from "../../shared/ui";
import axiosInstance from "../../utils/axiosInstance";
import { KeyUri } from "../../shared/key";
import { toast } from "react-toastify";

const CATEGORIES = ["Supplies", "Meals", "Software", "Travel", "Utilities", "Other"];

const empty = () => ({ title: "", category: "Supplies", date: "", amount: "", cgstPct: "", sgstPct: "", igstPct: "", paid_by: "", billed_to: "", status: "Pending", approved_date: "", document: "", cost_type: "indirect" });

const formatDateForApi = (dateStr) => dateStr || "";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};






const statusColor = (s) => {
  if (s === "Approved") return "bg-green-100 text-green-800";
  if (s === "Rejected") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
};

const COLUMNS = [
  { label: "Title" }, { label: "Category" }, { label: "Date" },
  { label: "Amount" }, { label: "Tax" }, { label: "Status" }, { label: "Approved Date" },
  { label: "Document", right: true }, { label: "Actions", right: true },
];

const getId = (row) => row?._id?.$oid || row?.id || "";

export default function OthersTab() {
  const dispatch = useDispatch();
  const { generalExpenseData, isLoading } = useSelector(generalExpenseSelector);
  const { user } = useSelector(authSelector);
  const isAdmin = user?.is_admin === true;

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty());
  const [docFile, setDocFile] = useState(null);
  const [docFileName, setDocFileName] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [statusPopup, setStatusPopup] = useState(null);
  const [lens, setLens] = useState({ x: 0, y: 0, show: false });

  const LENS_SIZE = 150;
  const ZOOM = 2.5;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLens({ x, y, clientX: e.clientX, clientY: e.clientY, show: true, dispW: rect.width, dispH: rect.height });
  };

  const handleMouseLeave = () => setLens((p) => ({ ...p, show: false }));

  const renderPdf = useCallback(async (url) => {
    const container = document.getElementById("pdf-container-gen");
    if (!container) return;
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      container.innerHTML = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        container.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      }
    } catch (err) { console.error("PDF render error:", err); }
  }, []);

  useEffect(() => {
    if (previewUrl && previewMime.startsWith("application/pdf")) {
      renderPdf(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl, previewMime, renderPdf]);

  useEffect(() => { dispatch(fetchGeneralExpenses()); }, [dispatch]);

  const openCreate = () => { setForm(empty()); setDocFile(null); setDocFileName(""); setModal({ mode: "create" }); };
  const openEdit = (row) => {
    const amount = parseFloat(row.amount) || 0;
    setForm({
      ...row,
      cgstPct: amount > 0 ? ((row.total_cgst || 0) / amount * 100).toFixed(2) : "",
      sgstPct: amount > 0 ? ((row.total_sgst || 0) / amount * 100).toFixed(2) : "",
      igstPct: amount > 0 ? ((row.total_igst || 0) / amount * 100).toFixed(2) : "",
      approved_date: row.approved_date || "",
      billed_to: row.billed_to || "",
      cost_type: row.cost_type || "indirect",
    });
    setDocFile(null);
    setDocFileName(row.document || "");
    setModal({ mode: "edit", id: getId(row) });
  };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setDocFile(file || null);
    setDocFileName(file ? file.name : "");
  };

  const calcTax = (amount, pct) => (parseFloat(amount) || 0) * (parseFloat(pct) || 0) / 100;

  const handleSave = async () => {
    if (form.status === "Approved" && !form.approved_date?.trim()) {
      toast.error("Approved date is required when status is Approved");
      return;
    }
    setSaving(true);
    try {
      let storedFilename = form.document || "";
      if (docFile) storedFilename = await uploadGeneralExpenseFile(docFile);
      const amount = parseFloat(form.amount) || 0;
      const totalCgst = calcTax(amount, form.cgstPct);
      const totalSgst = calcTax(amount, form.sgstPct);
      const totalIgst = calcTax(amount, form.igstPct);
      const payload = {
        ...form,
        amount,
        date: formatDateForApi(form.date),
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: totalIgst,
        billed_to: form.billed_to || null,
        approved_date: form.status === "Approved" ? formatDateForApi(form.approved_date) : null,
        document: storedFilename,
        cost_type: form.cost_type || "indirect",
      };
      if (modal.mode === "create") dispatch(createGeneralExpense(payload));
      else dispatch(updateGeneralExpense(modal.id, payload));
      closeModal();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = () => {
    const { id, status, row, approved_date } = statusPopup;
    if (status === "Approved" && !approved_date?.trim()) {
      toast.error("Approved date is required when status is Approved");
      return;
    }
    dispatch(updateGeneralExpense(id, {
      ...row,
      amount: parseFloat(row.amount) || 0,
      status,
      approved_date: status === "Approved" ? formatDateForApi(approved_date) : null,
      cost_type: row.cost_type || "indirect",
    }));
    setStatusPopup(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this record?")) return;
    dispatch(deleteGeneralExpense(id));
  };

  const handleViewDoc = async (filename) => {
    if (!filename) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${KeyUri.BACKENDURI}/general-expense-files/${filename}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const ext = filename.split(".").pop().toLowerCase();
      const mimeType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
        ? `image/${ext === "jpg" ? "jpeg" : ext}`
        : "application/pdf";
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      setPreviewUrl(blobUrl);
      setPreviewMime(mimeType);
      setShowPreview(true);
    } catch { toast.error("Unable to open document"); }
  };

  const handleDownloadDoc = async (filename) => {
    if (!filename) return;
    try {
      const res = await axiosInstance.get(`/general-expense-files/${filename}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Unable to download document"); }
  };

  const filtered = (generalExpenseData || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.title?.toLowerCase().includes(q) || r.paid_by?.toLowerCase().includes(q);
    const matchCat = categoryFilter === "All" || r.category === categoryFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalAmount = filtered.reduce((s, r) => s + (parseFloat(r.subTotal) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Search by title or paid by...">
        <FilterSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </FilterSelect>
        <CreateButton onClick={openCreate} label="Create" icon={Plus} />
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Amount" value={`₹ ${totalAmount.toLocaleString("en-IN")}`} valueClass="text-indigo-700" />
        <StatCard label="Pending" value={filtered.filter((r) => r.status === "Pending").length} valueClass="text-yellow-600" />
      </div>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? <EmptyRow colSpan={12} message="Loading..." /> :
            filtered.length === 0 ? <EmptyRow colSpan={12} /> :
              paginated.map((r) => {
                const id = getId(r);
                const locked = r.status === "Approved" && !isAdmin;
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{r.title}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{r.category}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-semibold">₹ {(parseFloat(r.amount) || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">₹ {(parseFloat(r.tax_amount) || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {(() => {
                        const locked = r.status === "Approved" && !isAdmin;
                        return (
                          <span
                            onClick={() => !locked && setStatusPopup({ id, status: r.status, row: r, approved_date: r.approved_date || "" })}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor(r.status)} ${!locked ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
                          >
                            {r.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{r.approved_date ? formatDate(r.approved_date) : "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.document ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDoc(r.document)}
                            className="flex items-center text-blue-600 text-xs underline cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(r.document)}
                            className="flex items-center text-blue-600 text-xs underline cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs flex justify-end">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <RowActions
                        onEdit={() => !locked && openEdit(r)}
                        onDelete={() => handleDelete(id)}
                        editDisabled={locked}
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
        totalCount={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
      />

      {statusPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Status</h3>
            <select
              value={statusPopup.status}
              onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            {statusPopup.status === "Approved" && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Approved Date *</label>
                <input
                  type="date"
                  value={statusPopup.approved_date || ""}
                  onChange={(e) => setStatusPopup((p) => ({ ...p, approved_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusPopup(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[80%] h-[85%] rounded-lg shadow-lg relative overflow-auto p-6">
            <button onClick={() => { setShowPreview(false); setPreviewUrl(null); setPreviewMime(""); }} className="absolute top-3 right-4 text-xl font-bold">✕</button>
            {previewMime.startsWith("image/") ? (
              <div className="flex items-center justify-center h-full">
                <div className="relative" style={{ display: "inline-flex" }}>
                  <img
                    src={previewUrl}
                    alt="Document"
                    style={{ maxHeight: "70vh", maxWidth: "100%", display: "block" }}
                    className="object-contain select-none cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    draggable={false}
                  />
                  {lens.show && (
                    <div
                      className="pointer-events-none fixed rounded-full border-2 border-white shadow-2xl z-9999"
                      style={{
                        width: LENS_SIZE,
                        height: LENS_SIZE,
                        left: lens.clientX - LENS_SIZE / 2,
                        top: lens.clientY - LENS_SIZE / 2,
                        backgroundImage: `url(${previewUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: `${lens.dispW * ZOOM}px ${lens.dispH * ZOOM}px`,
                        backgroundPosition: `-${lens.x * ZOOM - LENS_SIZE / 2}px -${lens.y * ZOOM - LENS_SIZE / 2}px`,
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div id="pdf-container-gen" className="flex flex-col items-center gap-6" />
            )}
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Add General Expense" : "Edit General Expense"} onClose={closeModal} onSave={handleSave} saving={saving}>
          <FormField label="Title" colSpan>
            <input type="text" name="title" value={form.title} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="Category">
            <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Date">
            <input type="date" name="date" value={form.date} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="Cost Type">
            <select name="cost_type" value={form.cost_type || "indirect"} onChange={handleChange} className={inputCls}>
              <option value="indirect">Indirect</option>
              <option value="direct">Direct</option>
            </select>
          </FormField>
          <FormField label="Amount (₹)">
            <input type="number" name="amount" value={form.amount} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="CGST %">
            <div className="flex gap-2 items-center">
              <input type="number" name="cgstPct" value={form.cgstPct} onChange={handleChange} className={inputCls} placeholder="e.g. 9" min="0" max="100" />
              {/* <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(form.amount, form.cgstPct).toFixed(2)}</span> */}
            </div>
          </FormField>
          <FormField label="SGST %">
            <div className="flex gap-2 items-center">
              <input type="number" name="sgstPct" value={form.sgstPct} onChange={handleChange} className={inputCls} placeholder="e.g. 9" min="0" max="100" />
              {/* <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(form.amount, form.sgstPct).toFixed(2)}</span> */}
            </div>
          </FormField>
          <FormField label="IGST %">
            <div className="flex gap-2 items-center">
              <input type="number" name="igstPct" value={form.igstPct} onChange={handleChange} className={inputCls} placeholder="e.g. 18" min="0" max="100" />
              {/* <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(form.amount, form.igstPct).toFixed(2)}</span> */}
            </div>
          </FormField>
          <FormField label="Total Tax Amount">
            <input readOnly value={(calcTax(form.amount, form.cgstPct) + calcTax(form.amount, form.sgstPct) + calcTax(form.amount, form.igstPct)).toFixed(2)} className={`${inputCls} bg-gray-50 text-gray-600`} />
          </FormField>
          <FormField label="Sub Total (incl. GST)">
            <input readOnly value={((parseFloat(form.amount) || 0) + calcTax(form.amount, form.cgstPct) + calcTax(form.amount, form.sgstPct) + calcTax(form.amount, form.igstPct)).toFixed(2)} className={`${inputCls} bg-gray-50 text-blue-700 font-semibold`} />
          </FormField>
          <FormField label="Paid By">
            <input type="text" name="paid_by" value={form.paid_by} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="Billed To">
            <select name="billed_to" value={form.billed_to || ""} onChange={handleChange} className={inputCls}>
              <option value="">Select</option>
              <option value="Self">Self</option>
              <option value="Company">Company</option>
              <option value="Client">Client</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </FormField>
          {form.status === "Approved" && (
            <FormField label="Approved Date *">
              <input type="date" name="approved_date" value={form.approved_date || ""} onChange={handleChange} className={inputCls} />
            </FormField>
          )}
          <FormField label="Document" colSpan>
            <div className="flex items-center gap-3">
              <input type="file" id="genExpDoc" className="hidden" onChange={handleFileChange} />
              <label htmlFor="genExpDoc" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm">
                {form.document || docFile ? "Change File" : "Choose File"}
              </label>
              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                {docFile ? docFile.name : form.document || "No file chosen"}
              </span>
            </div>
          </FormField>
        </Modal>
      )}
    </div>
  );
}
