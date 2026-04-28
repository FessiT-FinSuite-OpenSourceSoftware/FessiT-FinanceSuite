import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { CirclePlus, CircleMinus, ArrowLeft, Eye, Download } from "lucide-react";
import { updateIncomingInvoice } from "../../ReduxApi/incomingInvoice";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const emptyItem = () => ({
  description: "",
  quantity: "",
  rate: "",
  cgstPercent: "",
  sgstPercent: "",
  igstPercent: "",
  itemTotal: "",
});

function calcItem(item, isDomestic) {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const base = qty * rate;
  const cgst = isDomestic ? (base * (parseFloat(item.cgstPercent) || 0)) / 100 : 0;
  const sgst = isDomestic ? (base * (parseFloat(item.sgstPercent) || 0)) / 100 : 0;
  const igst = !isDomestic ? (base * (parseFloat(item.igstPercent) || 0)) / 100 : 0;
  return { base, cgst, sgst, igst, total: base + cgst + sgst + igst };
}

export default function EditIncomingInvoice() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [filePreviewType, setFilePreviewType] = useState(null); // "pdf" | "image"
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [newFile, setNewFile] = useState(null);

  const viewInvoiceFile = async (filename) => {
    if (!filename) return;
    try {
      const res = await axiosInstance.get(`/incoming-invoice-files/${filename}`, { responseType: "blob" });
      const ext = filename.split(".").pop().toLowerCase();
      const isImage = ["jpg", "jpeg", "png"].includes(ext);
      const mime = isImage ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/pdf";
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: mime }));
      setFilePreviewType(isImage ? "image" : "pdf");
      setFilePreviewUrl(blobUrl);
      setShowFilePreview(true);
    } catch {
      toast.error("Unable to preview file");
    }
  };

  const downloadInvoiceFile = async (filename) => {
    if (!filename) return;
    try {
      const res = await axiosInstance.get(`/incoming-invoice-files/${filename}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download file");
    }
  };

  const renderPdf = useCallback(async (url) => {
    const container = document.getElementById("incoming-pdf-container");
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
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (filePreviewUrl && filePreviewType === "pdf") {
      renderPdf(filePreviewUrl);
      return () => URL.revokeObjectURL(filePreviewUrl);
    }
  }, [filePreviewUrl, filePreviewType, renderPdf]);

  useEffect(() => {
    axiosInstance.get(`/incoming-invoices/${id}`).then(({ data }) => {
      // Map backend tds_applicable (bool) + tds_total (string) back to frontend tds_available/tds_percent
      const tdsApplicable = data.tds_applicable === true;
      const tdsTotal = parseFloat(data.tds_total || data.total_tds || 0);
      const subTotalVal = parseFloat(data.subTotal || 0);
      const tdsPercent = tdsApplicable && subTotalVal > 0
        ? ((tdsTotal / subTotalVal) * 100).toFixed(2)
        : "";
      setForm({
        ...data,
        items: data.items?.length ? data.items : [emptyItem()],
        tds_available: tdsApplicable ? "yes" : "no",
        tds_percent: tdsPercent,
        total_tds: data.tds_total || data.total_tds || "0.00",
        cost_type: data.cost_type || "indirect",
      });
    });
  }, [id]);

  if (!form) return <div className="p-6 text-gray-500">Loading...</div>;

  const isDomestic = (form.invoice_type || "domestic") === "domestic";

  const setField = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (field === "invoice_type" || field === "tds_available" || field === "tds_percent") {
      recalc(next.items || form.items, next);
    }
  };

  const recalc = (updatedItems, formOverride = form) => {
    const dom = (formOverride.invoice_type || "domestic") === "domestic";
    const tdsAvailable = (formOverride.tds_available || "no") === "yes";
    const tdsPercent = parseFloat(formOverride.tds_percent) || 0;
    let subTotal = 0, total_cgst = 0, total_sgst = 0, total_igst = 0;
    updatedItems.forEach((it) => {
      const c = calcItem(it, dom);
      subTotal += c.base;
      total_cgst += c.cgst;
      total_sgst += c.sgst;
      total_igst += c.igst;
    });
    const total_tds = tdsAvailable ? (subTotal * tdsPercent) / 100 : 0;
    const total = subTotal + total_cgst + total_sgst + total_igst - total_tds;
    setForm((f) => ({
      ...f,
      items: updatedItems,
      subTotal: subTotal.toFixed(2),
      total_cgst: total_cgst.toFixed(2),
      total_sgst: total_sgst.toFixed(2),
      total_igst: total_igst.toFixed(2),
      total_tds: total_tds.toFixed(2),
      total: total.toFixed(2),
    }));
  };

  const setItem = (idx, field, value) => {
    const updated = form.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    recalc(updated);
  };

  const addItem = () => recalc([...form.items, emptyItem()]);
  const removeItem = (idx) => recalc(form.items.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tds_applicable: form.tds_available === "yes",
        tds_total: form.total_tds || "0.00",
      };
      if (newFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (k === "items") fd.append(k, JSON.stringify(v));
          else if (v !== null && v !== undefined) fd.append(k, String(v));
        });
        fd.append("invoice_file", newFile);
        await axiosInstance.put(`/incoming-invoice-files/${id}`, fd);
        toast.success("Invoice updated successfully");
      } else {
        await dispatch(updateIncomingInvoice(id, payload));
      }
      nav("/expenses");
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="relative">
      {/* Sticky Top Bar */}
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="px-4 py-2 flex items-center gap-3">
            <ArrowLeft strokeWidth={1} onClick={() => nav(-1)} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Incoming Invoice</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDomestic ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
              {isDomestic ? "₹ Domestic" : "$ International"}
            </span>
          </div>
          <div className="flex flex-wrap justify-end mr-5 gap-2">
            {/* <button type="button" onClick={handleView} className="flex items-center gap-1 px-4 py-2 cursor-pointer text-black rounded-full border border-gray-300 text-sm hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600">
              <Eye className="w-4 h-4" /> View
            </button> */}
            {/* <button type="button" onClick={handleDownload} className="flex items-center gap-1 px-4 py-2 cursor-pointer text-black rounded-full border border-gray-300 text-sm hover:border-green-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-green-600">
              <Download className="w-4 h-4" /> Download
            </button> */}
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="bg-white rounded-lg shadow-lg p-8 pb-6 mt-5 space-y-8">

        {/* Vendor Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Vendor Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelCls}>Vendor Name *</label>
              <input className={inputCls} value={form.vendor_name || ""} onChange={(e) => setField("vendor_name", e.target.value)} placeholder="Enter vendor name" />
            </div>
            <div className="relative">
              <label className={labelCls}>Vendor GSTIN</label>
              <input className={inputCls} value={form.vendor_gstin || ""} onChange={(e) => setField("vendor_gstin", e.target.value)} placeholder="Enter GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Vendor Address</label>
              <textarea rows={3} className={inputCls} value={form.vendor_address || ""} onChange={(e) => setField("vendor_address", e.target.value)} placeholder="Enter vendor address" />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Invoice Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <label className={labelCls}>Invoice Number *</label>
              <input className={inputCls} value={form.invoice_number || ""} onChange={(e) => setField("invoice_number", e.target.value)} placeholder="Enter invoice number" />
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Date *</label>
              <input type="date" className={inputCls} value={form.invoice_date || ""} onChange={(e) => setField("invoice_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Due Date</label>
              <input type="date" className={inputCls} value={form.due_date || ""} onChange={(e) => setField("due_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Place of Supply</label>
              <input className={inputCls} value={form.place_of_supply || ""} onChange={(e) => setField("place_of_supply", e.target.value)} placeholder="Enter place of supply" />
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Type</label>
              <select className={inputCls} value={form.invoice_type || "domestic"} onChange={(e) => setField("invoice_type", e.target.value)}>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Cost Type</label>
              <select className={inputCls} value={form.cost_type || "indirect"} onChange={(e) => setField("cost_type", e.target.value)}>
                <option value="indirect">Indirect</option>
                <option value="direct">Direct</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={form.currency_type || "INR"} onChange={(e) => setField("currency_type", e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Purchase Order ID</label>
              <input className={inputCls} value={form.purchase_order_id || ""} onChange={(e) => setField("purchase_order_id", e.target.value)} placeholder="Enter PO ID" />
            </div>
            <div className="relative">
              <label className={labelCls}>TDS Deduction</label>
              <select className={inputCls} value={form.tds_available || "no"} onChange={(e) => setField("tds_available", e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {form.tds_available === "yes" && (
              <div className="relative">
                <label className={labelCls}>TDS Percentage</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={inputCls}
                  value={form.tds_percent || ""}
                  onChange={(e) => setField("tds_percent", e.target.value)}
                  placeholder="Enter TDS %"
                />
              </div>
            )}
            <div className="relative">
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status || "Unpaid"} onChange={(e) => setField("status", e.target.value)}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Line Items</h2>
          <table className="w-full border border-gray-300 border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-center">Sl No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Rate</th>
                {isDomestic ? (
                  <>
                    <th colSpan="2" className="border border-gray-300 px-3 py-2 text-center">CGST</th>
                    <th colSpan="2" className="border border-gray-300 px-3 py-2 text-center">SGST</th>
                  </>
                ) : (
                  <th colSpan="2" className="border border-gray-300 px-3 py-2 text-center">IGST</th>
                )}
                <th className="border border-gray-300 px-3 py-2 text-center">Amount</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
              </tr>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                {isDomestic ? (
                  <>
                    <th className="border border-gray-300 px-2 py-1 text-center">%</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Amt</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">%</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Amt</th>
                  </>
                ) : (
                  <>
                    <th className="border border-gray-300 px-2 py-1 text-center">%</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Amt</th>
                  </>
                )}
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => {
                const c = calcItem(item, isDomestic);
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700" value={item.description} onChange={(e) => setItem(idx, "description", e.target.value)} placeholder="Description" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input type="number" min="0" className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" value={item.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input type="number" min="0" className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" value={item.rate} onChange={(e) => setItem(idx, "rate", e.target.value)} />
                    </td>
                    {isDomestic ? (
                      <>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input type="number" min="0" max="100" className="w-14 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" value={item.cgstPercent} onChange={(e) => setItem(idx, "cgstPercent", e.target.value)} placeholder="%" />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{c.cgst.toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input type="number" min="0" max="100" className="w-14 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" value={item.sgstPercent} onChange={(e) => setItem(idx, "sgstPercent", e.target.value)} placeholder="%" />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{c.sgst.toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input type="number" min="0" max="100" className="w-14 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" value={item.igstPercent} onChange={(e) => setItem(idx, "igstPercent", e.target.value)} placeholder="%" />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{c.igst.toFixed(2)}</td>
                      </>
                    )}
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-800">{c.total.toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {idx === form.items.length - 1 ? (
                        <CirclePlus strokeWidth={1} className="text-green-600 cursor-pointer mx-auto" onClick={addItem} />
                      ) : (
                        <CircleMinus strokeWidth={1} className="text-red-500 cursor-pointer mx-auto" onClick={() => removeItem(idx)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Totals</h2>
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Sub Total</span>
                <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={form.subTotal || "0.00"} />
              </div>
              {isDomestic ? (
                <>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total CGST</span>
                    <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={form.total_cgst || "0.00"} />
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total SGST</span>
                    <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={form.total_sgst || "0.00"} />
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Total IGST</span>
                  <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={form.total_igst || "0.00"} />
                </div>
              )}
              {form.tds_available === "yes" && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">TDS Deduction</span>
                  <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={form.total_tds || "0.00"} />
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
                <span>Total</span>
                <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right font-bold text-indigo-700" value={form.total || "0.00"} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Additional Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={4} className={inputCls} value={form.notes || ""} onChange={(e) => setField("notes", e.target.value)} placeholder="Add any notes or terms" />
            </div>
            <div>
              <label className={labelCls}>Invoice File</label>
              {form.invoice_file && !newFile && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                  <span className="text-sm text-blue-900 truncate max-w-[200px]">{form.invoice_file}</span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => viewInvoiceFile(form.invoice_file)} className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer">
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button type="button" onClick={() => downloadInvoiceFile(form.invoice_file)} className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="invoiceFileUpload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setNewFile(file);
                  }}
                />
                <label htmlFor="invoiceFileUpload" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm">
                  {newFile ? "Change File" : form.invoice_file ? "Replace File" : "Choose File"}
                </label>
                <span className="text-sm text-gray-500 truncate max-w-[200px]">
                  {newFile ? newFile.name : form.invoice_file ? form.invoice_file : "No file chosen"}
                </span>
                {newFile && (
                  <button type="button" onClick={() => setNewFile(null)} className="text-xs text-red-500 underline cursor-pointer">Remove</button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {showFilePreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-200">
          <div className="bg-white w-[80%] h-[85%] rounded-lg shadow-lg relative overflow-auto p-6">
            <button onClick={() => { setShowFilePreview(false); setFilePreviewUrl(null); setFilePreviewType(null); }} className="absolute top-3 right-4 text-xl font-bold cursor-pointer">✕</button>
            {filePreviewType === "image" ? (
              <div className="flex justify-center items-start">
                <img src={filePreviewUrl} alt="Invoice" className="max-w-full rounded shadow" />
              </div>
            ) : (
              <div id="incoming-pdf-container" className="flex flex-col items-center gap-6" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
