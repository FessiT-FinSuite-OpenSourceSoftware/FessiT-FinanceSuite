import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { CirclePlus, CircleMinus, ArrowLeft, Eye } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { fetchIncomingInvoices } from "../../ReduxApi/incomingInvoice";

const emptyItem = () => ({
  description: "",
  quantity: "",
  rate: "",
  cgstPercent: "",
  sgstPercent: "",
  igstPercent: "",
  itemTotal: "",
});

const initialForm = {
  invoice_type: "domestic",
  vendor_name: "",
  vendor_gstin: "",
  vendor_address: "",
  invoice_number: "",
  invoice_date: "",
  due_date: "",
  place_of_supply: "",
  currency_type: "INR",
  purchase_order_id: "",
  notes: "",
  status: "Unpaid",
};

function calcItem(item, isDomestic) {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const base = qty * rate;
  const cgst = isDomestic ? (base * (parseFloat(item.cgstPercent) || 0)) / 100 : 0;
  const sgst = isDomestic ? (base * (parseFloat(item.sgstPercent) || 0)) / 100 : 0;
  const igst = !isDomestic ? (base * (parseFloat(item.igstPercent) || 0)) / 100 : 0;
  return { base, cgst, sgst, igst, total: base + cgst + sgst + igst };
}

export default function AddIncomingInvoice() {
  const nav = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const initialType = (() => {
    const t = new URLSearchParams(location.search).get("type");
    return t === "international" ? "international" : "domestic";
  })();

  const [form, setForm] = useState({ ...initialForm, invoice_type: initialType });
  const isDomestic = form.invoice_type === "domestic";
  const [items, setItems] = useState([emptyItem()]);
  const [totals, setTotals] = useState({ subTotal: "0.00", total_cgst: "0.00", total_sgst: "0.00", total_igst: "0.00", total: "0.00" });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceFileName, setInvoiceFileName] = useState("");
  const [invoiceFilePreview, setInvoiceFilePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "invoice_type") recalc(items, value === "domestic");
  };

  const recalc = (updatedItems, domOverride) => {
    const dom = domOverride !== undefined ? domOverride : isDomestic;
    let subTotal = 0, total_cgst = 0, total_sgst = 0, total_igst = 0;
    updatedItems.forEach((it) => {
      const c = calcItem(it, dom);
      subTotal += c.base;
      total_cgst += c.cgst;
      total_sgst += c.sgst;
      total_igst += c.igst;
    });
    const total = subTotal + total_cgst + total_sgst + total_igst;
    setItems(updatedItems);
    setTotals({
      subTotal: subTotal.toFixed(2),
      total_cgst: total_cgst.toFixed(2),
      total_sgst: total_sgst.toFixed(2),
      total_igst: total_igst.toFixed(2),
      total: total.toFixed(2),
    });
  };

  const setItem = (idx, field, value) => {
    const updated = items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    recalc(updated);
  };

  const addItem = () => recalc([...items, emptyItem()]);
  const removeItem = (idx) => recalc(items.filter((_, i) => i !== idx));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setInvoiceFile(file || null);
    setInvoiceFileName(file ? file.name : "");
    setInvoiceFilePreview(file ? URL.createObjectURL(file) : "");
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axiosInstance.post("/incoming-invoice-files", fd);
    return res.data.filename; // UUID-based stored name
  };

  const validate = () => {
    const e = {};
    if (!form.vendor_name.trim()) e.vendor_name = "Vendor name is required";
    if (!form.invoice_number.trim()) e.invoice_number = "Invoice number is required";
    if (!form.invoice_date.trim()) e.invoice_date = "Invoice date is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      let storedFilename = "";
      if (invoiceFile) {
        storedFilename = await uploadFile(invoiceFile);
      }
      const payload = {
        ...form,
        items,
        subTotal: totals.subTotal,
        total_cgst: totals.total_cgst,
        total_sgst: totals.total_sgst,
        total_igst: totals.total_igst,
        total: totals.total,
        invoice_file: storedFilename,
      };
      await axiosInstance.post("/incoming-invoices", payload);
      toast.success("Incoming invoice created successfully");
      dispatch(fetchIncomingInvoices());
      nav("/invoices");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create incoming invoice");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";
  const errCls = "absolute text-[13px] text-[#f10404]";

  return (
    <div className="relative">
      {/* Sticky Top Bar */}
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="px-4 py-2 flex items-center gap-3">
            <ArrowLeft strokeWidth={1} onClick={() => nav("/invoices")} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Add Incoming Invoice</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDomestic ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
              {isDomestic ? "₹ Domestic" : "$ International"}
            </span>
          </div>
          <div className="flex flex-wrap justify-end mr-5 gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600 disabled:opacity-50"
            >
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
              <input className={inputCls} value={form.vendor_name} onChange={(e) => setField("vendor_name", e.target.value)} placeholder="Enter vendor name" />
              {errors.vendor_name && <p className={errCls}>{errors.vendor_name}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>Vendor GSTIN</label>
              <input className={inputCls} value={form.vendor_gstin} onChange={(e) => setField("vendor_gstin", e.target.value)} placeholder="Enter GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Vendor Address</label>
              <textarea rows={3} className={inputCls} value={form.vendor_address} onChange={(e) => setField("vendor_address", e.target.value)} placeholder="Enter vendor address" />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Invoice Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <label className={labelCls}>Invoice Number *</label>
              <input className={inputCls} value={form.invoice_number} onChange={(e) => setField("invoice_number", e.target.value)} placeholder="Enter invoice number" />
              {errors.invoice_number && <p className={errCls}>{errors.invoice_number}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Date *</label>
              <input type="date" className={inputCls} value={form.invoice_date} onChange={(e) => setField("invoice_date", e.target.value)} />
              {errors.invoice_date && <p className={errCls}>{errors.invoice_date}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>Due Date</label>
              <input type="date" className={inputCls} value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Place of Supply</label>
              <input className={inputCls} value={form.place_of_supply} onChange={(e) => setField("place_of_supply", e.target.value)} placeholder="Enter place of supply" />
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Type</label>
              <select className={inputCls} value={form.invoice_type} onChange={(e) => setField("invoice_type", e.target.value)}>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={form.currency_type} onChange={(e) => setField("currency_type", e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Purchase Order ID</label>
              <input className={inputCls} value={form.purchase_order_id} onChange={(e) => setField("purchase_order_id", e.target.value)} placeholder="Enter PO ID" />
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
              {items.map((item, idx) => {
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
                      {idx === items.length - 1 ? (
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
                <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={totals.subTotal} />
              </div>
              {isDomestic ? (
                <>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total CGST</span>
                    <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={totals.total_cgst} />
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total SGST</span>
                    <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={totals.total_sgst} />
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Total IGST</span>
                  <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right text-sm" value={totals.total_igst} />
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
                <span>Total</span>
                <input readOnly className="border border-gray-300 rounded px-2 py-1 w-32 text-right font-bold text-indigo-700" value={totals.total} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes & File Upload */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Additional Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={4} className={inputCls} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Add any notes or terms" />
            </div>
            <div>
              <label className={labelCls}>Upload Invoice File</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="file"
                  id="invoiceFileUpload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="invoiceFileUpload"
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
                >
                  Choose File
                </label>
                <span className="text-sm text-gray-500 truncate max-w-[160px]">
                  {invoiceFileName || "No file chosen"}
                </span>
                {invoiceFilePreview && (
                  <button
                    type="button"
                    onClick={() => window.open(invoiceFilePreview, "_blank")}
                    className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Accepted: PDF, JPG, PNG, DOC</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
