import React, { useState, useEffect } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye, Download, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateDeliveryChallan } from "../../ReduxApi/deliveryChallan";
import { fetchCustomerData, customerSelector } from "../../ReduxApi/customer";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import PlaceOfSupplyField from "../Invoices/PlaceOfSupplyField";
import DeliveryChallanReport from "./DeliveryChallanReport";
import { UnitSelect } from "../../shared/ui";

const emptyItem = () => ({ description: "", hsn_code: "", quantity: "", unit: "" });

const UNITS = [];

export default function EditDeliveryChallan() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { customersData } = useSelector(customerSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);

  const [form, setForm]         = useState(null);
  const [items, setItems]       = useState([emptyItem()]);
  const [saving, setSaving]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [files, setFiles]       = useState({ dispatched_copy: null, acknowledged_copy: null });
  const [previewModal, setPreviewModal] = useState({ open: false, src: "", title: "", isPdf: false });
  const [customerSearch, setCustomerSearch]   = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  useEffect(() => { dispatch(fetchCustomerData()); }, [dispatch]);

  useEffect(() => {
    axiosInstance.get(`/delivery-challans/${id}`).then(({ data }) => {
      setForm(data);
      setItems(data.items?.length ? data.items : [emptyItem()]);
      setCustomerSearch(data.consignee_name || "");
    }).catch(() => toast.error("Failed to load challan"));
  }, [id]);

  if (!form) return <div className="p-6 text-gray-500">Loading...</div>;

  const allCustomers = Array.isArray(customersData) ? customersData : [];
  const filteredCustomers = allCustomers.filter((c) =>
    `${c.companyName || ""} ${c.customerName || ""}`.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleCustomerSelect = (c) => {
    const address = c.addresses?.find((a) => a.value)?.value || c.addresses?.[0]?.value || "";
    setForm((f) => ({ ...f, consignee_name: c.companyName || c.customerName || "", consignee_address: address, consignee_gstin: c.gstIN || "" }));
    setCustomerSearch(c.companyName || c.customerName || "");
    setShowCustomerDrop(false);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem  = (idx, k, v) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const addItem    = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  const openFile = async (filename, title) => {
    try {
      const res = await axiosInstance.get(`/delivery-challan-files/${filename}`, { responseType: "blob" });
      const isPdf = filename.toLowerCase().endsWith(".pdf");
      const mime  = isPdf ? "application/pdf" : res.data.type || "image/jpeg";
      const src   = URL.createObjectURL(new Blob([res.data], { type: mime }));
      setPreviewModal({ open: true, src, title, isPdf });
    } catch { toast.error("Unable to open file"); }
  };

  const downloadFile = async (filename, title) => {
    try {
      const res = await axiosInstance.get(`/delivery-challan-files/${filename}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Unable to download file"); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await dispatch(updateDeliveryChallan(id, { ...form, items }, files));
      nav("/delivery-challans");
    } catch { /* toast handled in redux */ }
    finally { setSaving(false); }
  };

  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

  if (showPreview) {
    return <DeliveryChallanReport challanData={{ ...form, items }} orgData={currentOrganisation} onBack={() => setShowPreview(false)} />;
  }

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="px-4 py-2 flex items-center gap-3">
            <ArrowLeft strokeWidth={1} onClick={() => nav(-1)} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Edit Delivery Challan</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          form.status === "Delivered" ? "bg-green-100 text-green-700" :
              form.status === "Dispatched" ? "bg-blue-100 text-blue-700" :
              form.status === "Cancelled" ? "bg-red-100 text-red-700" :
              form.status === "Returned" ? "bg-orange-100 text-orange-700" :
              form.status === "Partially Returned" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
            }`}>{form.status || "Draft"}</span>
          </div>
          <div className="mr-5 flex gap-2">
            <button onClick={async () => { await dispatch(fetchOrganisationByEmail(localStorage.getItem("email"), true)); setShowPreview(true); }}
              className="flex items-center gap-1 px-4 py-2 cursor-pointer text-black rounded-full border border-gray-300 text-sm hover:border-blue-500 hover:text-blue-600 transition-all duration-200">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all duration-200 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 pb-6 mt-5 space-y-8">

        {/* Challan Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Challan Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <label className={labelCls}>Challan No</label>
              <input
                className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
                value={form.challan_no || ""}
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1">Auto-generated</p>
            </div>
            <div className="relative">
              <label className={labelCls}>Challan Date</label>
              <input type="date" className={inputCls} value={form.challan_date || ""} onChange={(e) => setField("challan_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Dispatch Date</label>
              <input type="date" className={inputCls} value={form.dispatch_date || ""} onChange={(e) => setField("dispatch_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Reference</label>
              <input className={inputCls} value={form.invoice_ref || ""} onChange={(e) => setField("invoice_ref", e.target.value)} placeholder="e.g. INV/2024/001" />
            </div>
            <div className="relative">
              <label className={labelCls}>PO Reference</label>
              <input className={inputCls} value={form.po_reference || ""} onChange={(e) => setField("po_reference", e.target.value)} placeholder="e.g. PO-2024-001" />
            </div>
            <PlaceOfSupplyField value={form.place_of_supply || ""} onChange={(e) => setField("place_of_supply", e.target.value)} labelClassName={labelCls} inputClassName={inputCls} />
            <div className="relative">
              <label className={labelCls}>Purpose</label>
              <select className={inputCls} value={form.purpose || "Sale - Against Invoice"} onChange={(e) => setField("purpose", e.target.value)}>
                <option>Sale - Against Invoice</option>
                <option>Job Work</option>
                <option>Return</option>
                <option>Exhibition / Fairs</option>
                <option>Others</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status || "Draft"} onChange={(e) => setField("status", e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Returned">Returned</option>
                <option value="Partially Returned">Partially Returned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Return Info */}
        {(form.status === "Returned" || form.status === "Partially Returned") && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Return Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelCls}>Returned Date</label>
              <input type="date" className={inputCls} value={form.returned_date || ""} onChange={(e) => setField("returned_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Return Notes</label>
              <input className={inputCls} value={form.return_notes || ""} onChange={(e) => setField("return_notes", e.target.value)} placeholder="Reason for return..." />
            </div>
          </div>
        </div>
        )}

        {/* Consignor */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Consignor (From)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.consignor_name || ""} onChange={(e) => setField("consignor_name", e.target.value)} placeholder="Consignor name" />
            </div>
            <div className="relative">
              <label className={labelCls}>GSTIN</label>
              <input className={inputCls} value={form.consignor_gstin || ""} onChange={(e) => setField("consignor_gstin", e.target.value)} placeholder="GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Address</label>
              <textarea rows={2} className={inputCls} value={form.consignor_address || ""} onChange={(e) => setField("consignor_address", e.target.value)} placeholder="Consignor address" />
            </div>
          </div>
        </div>

        {/* Consignee */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Consignee (To)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 relative">
              <label className={labelCls}>Search Customer</label>
              <div className="relative w-full sm:w-1/2 lg:w-1/3">
                <input type="text" className={inputCls} placeholder="Search customers..." value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDrop(false), 200)} />
                {showCustomerDrop && customerSearch && (
                  <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.length > 0 ? filteredCustomers.map((c) => {
                      const cid = c?._id?.$oid || c?._id || "";
                      return (
                        <div key={cid} className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onMouseDown={() => handleCustomerSelect(c)}>
                          <span className="font-medium text-gray-800">{c.companyName || c.customerName}</span>
                          {c.gstIN && <span className="text-xs text-gray-400 ml-2">{c.gstIN}</span>}
                        </div>
                      );
                    }) : <div className="px-3 py-2 text-sm text-gray-400">No customers found</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.consignee_name || ""} onChange={(e) => setField("consignee_name", e.target.value)} placeholder="Consignee name" />
            </div>
            <div className="relative">
              <label className={labelCls}>GSTIN</label>
              <input className={inputCls} value={form.consignee_gstin || ""} onChange={(e) => setField("consignee_gstin", e.target.value)} placeholder="GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Address</label>
              <textarea rows={2} className={inputCls} value={form.consignee_address || ""} onChange={(e) => setField("consignee_address", e.target.value)} placeholder="Consignee address" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Items</h2>
          <table className="w-full border border-gray-300 border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-center">Sl No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-3 py-2 text-center">HSN/CAC</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Unit</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700" value={item.description || ""} onChange={(e) => setItem(idx, "description", e.target.value)} placeholder="Description" />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <input className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" value={item.hsn_code || ""} onChange={(e) => setItem(idx, "hsn_code", e.target.value)} placeholder="HSN" />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <input type="number" min="0" className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" value={item.quantity || ""} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex justify-center">
                      <UnitSelect value={item.unit || ""} onChange={(v) => setItem(idx, "unit", v)} />
                    </div>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {idx === items.length - 1
                      ? <CirclePlus strokeWidth={1} className="text-green-600 cursor-pointer mx-auto" onClick={addItem} />
                      : <CircleMinus strokeWidth={1} className="text-red-500 cursor-pointer mx-auto" onClick={() => removeItem(idx)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Documents */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Documents</h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: "dispatched_copy",   label: "Dispatched Copy" },
              { key: "acknowledged_copy", label: "Acknowledged Copy" },
            ].map(({ key, label }) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mb-3">{form[key] ? "Available" : "Not uploaded"}</p>
                {/* View + Download for existing file */}
                {form[key] && (
                  <div className="flex gap-2 mb-3">
                    <button type="button"
                      onClick={() => openFile(form[key], label)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button type="button"
                      onClick={() => downloadFile(form[key], label)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                )}
                {/* Replace / upload */}
                <div className="flex items-center gap-3">
                  <input type="file" id={key} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFiles((f) => ({ ...f, [key]: e.target.files[0] || null }))} />
                  <label htmlFor={key} className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 text-xs font-medium">
                    {form[key] ? "Replace" : "Upload"}
                  </label>
                  {files[key] && (
                    <>
                      <span className="text-xs text-gray-600 truncate max-w-[140px]">{files[key].name}</span>
                      <button type="button" onClick={() => setFiles((f) => ({ ...f, [key]: null }))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG accepted</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Delivery Notes</h2>
          <textarea rows={3} className={inputCls} value={form.delivery_notes || ""} onChange={(e) => setField("delivery_notes", e.target.value)} placeholder="Add delivery notes or remarks..." />
        </div>
      </div>

      {/* File Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/75 p-4" onClick={() => setPreviewModal({ open: false, src: "", title: "", isPdf: false })}>
          <div className="max-w-5xl w-full rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">{previewModal.title}</h3>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = previewModal.src;
                    a.download = previewModal.title;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Download">
                  <Download className="w-5 h-5" />
                </button>
                <button type="button"
                  onClick={() => setPreviewModal({ open: false, src: "", title: "", isPdf: false })}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              {previewModal.isPdf ? (
                <iframe src={previewModal.src} title={previewModal.title} className="w-full rounded-xl" style={{ height: "75vh" }} />
              ) : (
                <img src={previewModal.src} alt={previewModal.title} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
