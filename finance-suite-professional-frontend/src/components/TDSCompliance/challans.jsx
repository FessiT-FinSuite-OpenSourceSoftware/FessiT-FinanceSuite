import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Eye, Download } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  challanSelector,
  createChallan,
  deleteChallan,
  fetchChallans,
  updateChallan,
} from "../../ReduxApi/challan";
import axiosInstance from "../../utils/axiosInstance";
import { KeyUri } from "../../shared/key";
import {
  StatCard,
  TabActionBar,
  FilterSelect,
  CreateButton,
  TableWrapper,
  TableHead,
  EmptyRow,
  RowActions,
  Modal,
  FormField,
  Pagination,
  inputCls,
} from "../../shared/ui";
import { toast } from "react-toastify";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SECTION_OPTIONS = ["192", "194C", "194J", "194H", "194I", "Other"];
const CHALLAN_FILE_FIELD = "file";

const emptyChallan = () => ({
  challan_no: "",
  section: "194C",
  payment_date: "",
  date_of_challan: "",
  amount_paid: "",
  file: "",
});

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

export default function ChallansTab() {
  const dispatch = useDispatch();
  const { challanData, isLoading } = useSelector(challanSelector);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyChallan());
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [docFile, setDocFile] = useState(null);
  const [docFileName, setDocFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [lens, setLens] = useState({ x: 0, y: 0, show: false });

  const LENS_SIZE = 150;
  const ZOOM = 2.5;

  useEffect(() => {
    dispatch(fetchChallans());
  }, [dispatch]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLens({
      x,
      y,
      clientX: e.clientX,
      clientY: e.clientY,
      show: true,
      dispW: rect.width,
      dispH: rect.height,
    });
  };

  const handleMouseLeave = () => setLens((prev) => ({ ...prev, show: false }));

  const renderPdf = useCallback(async (url) => {
    const container = document.getElementById("pdf-container-challan");
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
    } catch (err) {
      console.error("Challan PDF render error:", err);
    }
  }, []);

  useEffect(() => {
    if (previewUrl && previewMime.startsWith("application/pdf")) {
      renderPdf(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl, previewMime, renderPdf]);

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
      section: row.section || "194C",
      payment_date: row.payment_date || "",
      date_of_challan: row.date_of_challan || "",
      amount_paid: row.amount_paid ?? "",
      file: filename,
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
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${KeyUri.BACKENDURI}/challan-files/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    } catch {
      toast.error("Unable to open challan file");
    }
  };

  const handleDownloadDoc = async (filename) => {
    if (!filename) return;
    try {
      const res = await axiosInstance.get(`/challan-files/${filename}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download challan file");
    }
  };

  const handleSave = async () => {
    if (!form.challan_no.trim()) {
      toast.error("Challan number is required");
      return;
    }
    if (!form.payment_date.trim()) {
      toast.error("Payment date is required");
      return;
    }
    if (!form.date_of_challan.trim()) {
      toast.error("Date of challan is required");
      return;
    }
    if (!form.amount_paid.toString().trim()) {
      toast.error("Amount paid is required");
      return;
    }
    if (!docFile && !form.file && !docFileName) {
      toast.error("Challan file is required");
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries({
        challan_no: form.challan_no,
        section: form.section,
        payment_date: form.payment_date,
        date_of_challan: form.date_of_challan,
        amount_paid: parseFloat(form.amount_paid) || 0,
      }).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, String(value));
        }
      });
      if (docFile) {
        payload.append(CHALLAN_FILE_FIELD, docFile);
      }

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

  const handleDelete = (id) => {
    if (!window.confirm("Delete this challan?")) return;
    dispatch(deleteChallan(id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Array.isArray(challanData) ? challanData : []).filter((row) => {
      const section = row.section || "";
      const challanNo = row.challan_no || row.challanNo || "";
      const paymentDate = row.payment_date || "";
      const dateOfChallan = row.date_of_challan || "";
      const matchesSearch =
        !q ||
        challanNo.toLowerCase().includes(q) ||
        section.toLowerCase().includes(q) ||
        paymentDate.toLowerCase().includes(q) ||
        dateOfChallan.toLowerCase().includes(q);
      const matchesSection = sectionFilter === "All" || section === sectionFilter;
      return matchesSearch && matchesSection;
    });
  }, [challanData, search, sectionFilter]);

  const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row.amount_paid) || 0), 0);
  const withFileCount = filtered.filter((row) => getFilename(row)).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <div className="sticky top-[146px] z-30">
        <TabActionBar
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search by challan no, payment date, or challan date..."
        >
          <FilterSelect
            value={sectionFilter}
            onChange={(value) => {
              setSectionFilter(value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Sections</option>
            {SECTION_OPTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </FilterSelect>
          <CreateButton onClick={openCreate} label="Add Challan" icon={Plus} />
        </TabActionBar>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Amount" value={formatAmount(totalAmount)} valueClass="text-indigo-700" />
        {/* <StatCard label="With File" value={withFileCount} valueClass="text-green-700" /> */}
      </div>

      <TableWrapper>
        <TableHead
          columns={[
            { label: "Challan No" },
            { label: "Section" },
            { label: "Payment Date" },
            { label: "Date of Challan" },
            { label: "Amount Paid" },
            { label: "File", right: true },
            { label: "Actions", right: true },
          ]}
        />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={7} message="Loading challans..." />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            paginated.map((row) => {
              const id = getId(row);
              const challanNo = row.challan_no || row.challanNo || "-";
              const filename = getFilename(row);
              return (
                <tr key={id || challanNo} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{challanNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{row.section || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(row.payment_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(row.date_of_challan)}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{formatAmount(row.amount_paid)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {filename ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDoc(filename)}
                          className="flex items-center text-blue-600 text-xs underline cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(filename)}
                          className="flex items-center text-blue-600 text-xs underline cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs flex justify-end">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <RowActions onEdit={() => openEdit(row)} onDelete={() => handleDelete(id)} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableWrapper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setCurrentPage(1);
        }}
      />

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Add Challan" : "Edit Challan"}
          onClose={closeModal}
          onSave={handleSave}
          saveLabel={saving ? "Saving..." : "Save"}
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
          <FormField label="Section">
            <select name="section" value={form.section} onChange={handleChange} className={inputCls}>
              {SECTION_OPTIONS.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Payment Date">
            <input
              type="date"
              name="payment_date"
              value={form.payment_date}
              onChange={handleChange}
              className={inputCls}
            />
          </FormField>
          <FormField label="Date of Challan">
            <input
              type="date"
              name="date_of_challan"
              value={form.date_of_challan}
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

      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100]">
          <div className="bg-white w-[80%] h-[85%] rounded-lg shadow-lg relative overflow-auto p-6">
            <button
              onClick={() => {
                setShowPreview(false);
                setPreviewUrl(null);
                setPreviewMime("");
              }}
              className="absolute top-3 right-4 text-xl font-bold cursor-pointer"
            >
              ×
            </button>
            {previewMime.startsWith("image/") ? (
              <div className="flex justify-center items-start">
                <img
                  src={previewUrl}
                  alt="Challan"
                  className="max-w-full rounded shadow"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  draggable={false}
                />
                {lens.show && (
                  <div
                    className="pointer-events-none fixed rounded-full border-2 border-white shadow-2xl z-[1101]"
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
            ) : (
              <div id="pdf-container-challan" className="flex flex-col items-center gap-6" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
