import React, { useState, useEffect } from "react";
import { ArrowLeft, CirclePlus, CircleMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createDeliveryChallan } from "../../ReduxApi/deliveryChallan";
import { fetchCustomerData, customerSelector } from "../../ReduxApi/customer";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import PlaceOfSupplyField from "../Invoices/PlaceOfSupplyField";
import { UnitSelect } from "../../shared/ui";

const emptyItem = () => ({ description: "", hsn_code: "", quantity: "", unit: "" });

const UNITS = []; // kept for reference, UnitSelect handles its own list

const initialForm = {
  challan_no: "", challan_date: "", dispatch_date: "", invoice_ref: "",
  po_reference: "", place_of_supply: "", purpose: "Sale - Against Invoice",
  consignor_name: "", consignor_address: "", consignor_gstin: "",
  consignee_name: "", consignee_address: "", consignee_gstin: "",
  delivery_notes: "", status: "Draft",
};

export default function AddDeliveryChallan() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { customersData } = useSelector(customerSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);

  const [form, setForm]       = useState(initialForm);
  const [items, setItems]     = useState([emptyItem()]);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [dispatchedFile, setDispatchedFile]     = useState(null);
  const [acknowledgedFile, setAcknowledgedFile] = useState(null);
  const [files, setFiles]     = useState({ dispatched_copy: null, acknowledged_copy: null });

  useEffect(() => {
    dispatch(fetchCustomerData());
    dispatch(fetchOrganisationByEmail(localStorage.getItem("email")));
  }, [dispatch]);

  useEffect(() => {
    if (currentOrganisation) {
      setForm((f) => ({
        ...f,
        consignor_name:    currentOrganisation.organizationName || "",
        consignor_address: currentOrganisation.addresses?.[0]?.value || "",
        consignor_gstin:   currentOrganisation.gstIN || "",
      }));
    }
  }, [currentOrganisation]);

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

  const validate = () => {
    const e = {};
    if (!form.challan_no.trim())      e.challan_no      = "Challan number is required";
    if (!form.challan_date.trim())    e.challan_date    = "Challan date is required";
    if (!form.consignee_name.trim())  e.consignee_name  = "Consignee name is required";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await dispatch(createDeliveryChallan({ ...form, items }, files));
      nav("/delivery-challans");
    } catch { /* toast handled in redux */ }
    finally { setSaving(false); }
  };

  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";
  const errCls   = "absolute text-[13px] text-[#f10404]";

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="px-4 py-2 flex items-center gap-3">
            <ArrowLeft strokeWidth={1} onClick={() => nav(-1)} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Create Delivery Challan</span>
          </div>
          <div className="mr-5">
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
              <label className={labelCls}>Challan No *</label>
              <input className={inputCls} value={form.challan_no} onChange={(e) => setField("challan_no", e.target.value)} placeholder="e.g. DC/2024/001" />
              {errors.challan_no && <p className={errCls}>{errors.challan_no}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>Challan Date *</label>
              <input type="date" className={inputCls} value={form.challan_date} onChange={(e) => setField("challan_date", e.target.value)} />
              {errors.challan_date && <p className={errCls}>{errors.challan_date}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>Dispatch Date</label>
              <input type="date" className={inputCls} value={form.dispatch_date} onChange={(e) => setField("dispatch_date", e.target.value)} />
            </div>
            <div className="relative">
              <label className={labelCls}>Invoice Reference</label>
              <input className={inputCls} value={form.invoice_ref} onChange={(e) => setField("invoice_ref", e.target.value)} placeholder="e.g. INV/2024/001" />
            </div>
            <div className="relative">
              <label className={labelCls}>PO Reference</label>
              <input className={inputCls} value={form.po_reference} onChange={(e) => setField("po_reference", e.target.value)} placeholder="e.g. PO-2024-001" />
            </div>
            <PlaceOfSupplyField value={form.place_of_supply} onChange={(e) => setField("place_of_supply", e.target.value)} labelClassName={labelCls} inputClassName={inputCls} />
            <div className="relative">
              <label className={labelCls}>Purpose</label>
              <select className={inputCls} value={form.purpose} onChange={(e) => setField("purpose", e.target.value)}>
                <option>Sale - Against Invoice</option>
                <option>Job Work</option>
                <option>Return</option>
                <option>Exhibition / Fairs</option>
                <option>Others</option>
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Consignor */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Consignor (From)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.consignor_name} onChange={(e) => setField("consignor_name", e.target.value)} placeholder="Consignor name" />
            </div>
            <div className="relative">
              <label className={labelCls}>GSTIN</label>
              <input className={inputCls} value={form.consignor_gstin} onChange={(e) => setField("consignor_gstin", e.target.value)} placeholder="GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Address</label>
              <textarea rows={2} className={inputCls} value={form.consignor_address} onChange={(e) => setField("consignor_address", e.target.value)} placeholder="Consignor address" />
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
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={form.consignee_name} onChange={(e) => setField("consignee_name", e.target.value)} placeholder="Consignee name" />
              {errors.consignee_name && <p className={errCls}>{errors.consignee_name}</p>}
            </div>
            <div className="relative">
              <label className={labelCls}>GSTIN</label>
              <input className={inputCls} value={form.consignee_gstin} onChange={(e) => setField("consignee_gstin", e.target.value)} placeholder="GSTIN" />
            </div>
            <div className="col-span-2 relative">
              <label className={labelCls}>Address</label>
              <textarea rows={2} className={inputCls} value={form.consignee_address} onChange={(e) => setField("consignee_address", e.target.value)} placeholder="Consignee address" />
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
                    <input className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700" value={item.description} onChange={(e) => setItem(idx, "description", e.target.value)} placeholder="Description" />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <input className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" value={item.hsn_code} onChange={(e) => setItem(idx, "hsn_code", e.target.value)} placeholder="HSN" />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <input type="number" min="0" className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" value={item.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex justify-center">
                      <UnitSelect value={item.unit} onChange={(v) => setItem(idx, "unit", v)} />
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
          <div className="grid grid-cols-2 gap-4">
            {["dispatched_copy", "acknowledged_copy"].map((key) => (
              <div key={key}>
                <label className={labelCls}>{key === "dispatched_copy" ? "Dispatched Copy" : "Acknowledged Copy"}</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="file" id={key} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFiles((f) => ({ ...f, [key]: e.target.files[0] || null }))} />
                  <label htmlFor={key} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm">Choose File</label>
                  <span className="text-sm text-gray-500 truncate max-w-[180px]">{files[key]?.name || "No file chosen"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Accepted: PDF, JPG, PNG</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Delivery Notes</h2>
          <textarea rows={3} className={inputCls} value={form.delivery_notes} onChange={(e) => setField("delivery_notes", e.target.value)} placeholder="Add delivery notes or remarks..." />
        </div>
      </div>
    </div>
  );
}
