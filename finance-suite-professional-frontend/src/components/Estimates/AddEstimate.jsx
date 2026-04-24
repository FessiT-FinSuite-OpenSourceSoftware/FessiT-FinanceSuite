import React, { useEffect, useState } from "react";
import { CirclePlus, CircleMinus, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createEstimate, fetchNextEstimateNumber } from "../../ReduxApi/estimate";
import { fetchProductData, productSelector } from "../../ReduxApi/product";
import { fetchCustomerData, customerSelector } from "../../ReduxApi/customer";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import EstimateReportGeneration from "./EstimateReportGeneration";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD"];

const emptyItem = () => ({
  name: "",
  isManual: false,
  quantity: "",
  unitPrice: "",
  discount: "",
  taxRate: "",
  amount: 0,
});

const calcAmount = (item) => {
  const qty   = parseFloat(item.quantity)  || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc  = parseFloat(item.discount)  || 0;
  const tax   = parseFloat(item.taxRate)   || 0;
  const base  = qty * price;
  const afterDisc = base - (base * disc) / 100;
  return +(afterDisc + (afterDisc * tax) / 100).toFixed(2);
};

const getCustomerId = (c) => c?._id?.$oid || c?._id || c?.id || "";

export default function AddEstimate() {
  const dispatch = useDispatch();
  const nav      = useNavigate();
  const { productData }   = useSelector(productSelector);
  const { customersData } = useSelector(customerSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);

  const [estimateNumber, setEstimateNumber] = useState("");
  const [form, setForm] = useState({
    customerId: "", issueDate: "", expiryDate: "",
    currency: "INR", discount: "", notes: "", terms: "",
  });
  const [items, setItems]                       = useState([emptyItem()]);
  const [itemSearchQueries, setItemSearchQueries] = useState([""]);
  const [customerSearch, setCustomerSearch]     = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [errors, setErrors]                     = useState({});
  const [showPreview, setShowPreview]           = useState(false);

  useEffect(() => {
    dispatch(fetchProductData());
    dispatch(fetchCustomerData());
    dispatch(fetchNextEstimateNumber()).then((num) => setEstimateNumber(num || ""));
    const email = localStorage.getItem("email");
    if (email) dispatch(fetchOrganisationByEmail(email));
  }, [dispatch]);

  // ── recalc subtotal/total whenever items or discount change ──────────────
  const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const discAmt  = (subtotal * (parseFloat(form.discount) || 0)) / 100;
  const total    = +(subtotal - discAmt).toFixed(2);

  // ── customer helpers ─────────────────────────────────────────────────────
  const filteredCustomers = (Array.isArray(customersData) ? customersData : []).filter((c) => {
    const label = `${c.companyName || ""} ${c.customerName || ""}`.toLowerCase();
    return label.includes(customerSearch.toLowerCase());
  });

  const handleCustomerSelect = (c) => {
    setForm((p) => ({ ...p, customerId: getCustomerId(c) }));
    setCustomerSearch(c.companyName || c.customerName || "");
    setShowCustomerDrop(false);
  };

  // ── item helpers ─────────────────────────────────────────────────────────
  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [name]: value };
      next.amount = calcAmount(next);
      return next;
    }));
  };

  const handleProductSelect = (idx, product) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      if (product === "__manual__") return { ...item, name: "", isManual: true };
      const next = {
        ...item,
        name:      product.name || "",
        unitPrice: String(product.sale_price ?? product.salePrice ?? ""),
        isManual:  false,
      };
      next.amount = calcAmount(next);
      return next;
    }));
    setItemSearchQueries((prev) => { const q = [...prev]; q[idx] = ""; return q; });
  };

  const addItem = () => {
    setItems((p) => [...p, emptyItem()]);
    setItemSearchQueries((p) => [...p, ""]);
  };

  const removeItem = (idx) => {
    setItems((p) => p.filter((_, i) => i !== idx));
    setItemSearchQueries((p) => p.filter((_, i) => i !== idx));
  };

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.issueDate)   errs.issueDate = "Issue date is required";
    if (!form.currency)    errs.currency  = "Currency is required";
    if (items.length === 0) errs.items    = "At least one item is required";
    items.forEach((it, i) => {
      if (!it.name.trim())               errs[`item_${i}_name`]     = "Name required";
      if (!(parseFloat(it.quantity) > 0)) errs[`item_${i}_qty`]    = "Qty > 0";
      if (parseFloat(it.unitPrice) < 0)   errs[`item_${i}_price`]  = "Price ≥ 0";
    });
    if (Object.keys(errs).length) { setErrors(errs); toast.error("Please fix the errors"); return; }
    setErrors({});

    const payload = {
      estimateNumber,
      customerId:  form.customerId || null,
      issueDate:   form.issueDate,
      expiryDate:  form.expiryDate || null,
      currency:    form.currency,
      discount:    parseFloat(form.discount) || null,
      notes:       form.notes || null,
      terms:       form.terms || null,
      subtotal,
      total,
      items: items.map((it) => ({
        name:        it.name,
        quantity:    parseFloat(it.quantity)  || 0,
        unitPrice:   parseFloat(it.unitPrice) || 0,
        discount:    it.discount !== "" ? parseFloat(it.discount) : null,
        taxRate:     it.taxRate  !== "" ? parseFloat(it.taxRate)  : null,
        amount:      it.amount,
      })),
    };

    setSaving(true);
    try {
      await dispatch(createEstimate(payload));
      nav("/estimates");
    } finally {
      setSaving(false);
    }
  };

  const previewData = {
    estimateNumber,
    companyName:    currentOrganisation?.organizationName || currentOrganisation?.companyName || "",
    companyAddress: currentOrganisation?.addresses?.[0]?.value || "",
    companyGstin:   currentOrganisation?.gstIN || "",
    companyEmail:   currentOrganisation?.email || "",
    companyPhone:   currentOrganisation?.phone || "",
    customerId: form.customerId,
    customerName: (Array.isArray(customersData) ? customersData : [])
      .find((c) => getCustomerId(c) === form.customerId)?.companyName ||
      (Array.isArray(customersData) ? customersData : [])
      .find((c) => getCustomerId(c) === form.customerId)?.customerName || "",
    issueDate: form.issueDate,
    expiryDate: form.expiryDate,
    currency: form.currency,
    discount: parseFloat(form.discount) || 0,
    notes: form.notes,
    terms: form.terms,
    subtotal,
    total,
    items: items.map((it) => ({
      name: it.name,
      description: it.description || "",
      quantity: parseFloat(it.quantity) || 0,
      unitPrice: parseFloat(it.unitPrice) || 0,
      discount: it.discount !== "" ? parseFloat(it.discount) : null,
      taxRate: it.taxRate !== "" ? parseFloat(it.taxRate) : null,
      amount: it.amount,
    })),
  };

  if (showPreview) {
    return <EstimateReportGeneration estimateData={previewData} onBack={() => setShowPreview(false)} />;
  }

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="sticky top-[88px] w-full z-30 rounded-lg bg-white border border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between px-4">
          <div className="flex items-center gap-3">
            <ArrowLeft strokeWidth={1} className="cursor-pointer" onClick={() => nav("/estimates")} />
            <span className="text-sm font-semibold text-gray-700">Create Estimate</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setShowPreview(true)} className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600">
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 pb-6 mt-5">

        {/* Estimate Details */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Estimate Details</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Estimate No</label>
            <input
              type="text"
              value={estimateNumber}
              disabled
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-gray-50 cursor-not-allowed text-gray-700"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Issue Date *</label>
            <input type="date" name="issueDate" value={form.issueDate} onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm" />
            {errors.issueDate && <p className="absolute text-[13px] text-red-500">{errors.issueDate}</p>}
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
            <input type="date" name="expiryDate" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm" />
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Currency *</label>
            <select name="currency" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Overall Discount (%)</label>
            <input type="number" name="discount" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="0" min="0" max="100" />
          </div>
        </div>

        {/* Customer */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Customer Details</h2>
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Select Customer</label>
          <div className="relative w-full sm:w-1/2 lg:w-1/3">
            <input
              type="text"
              placeholder="Search customer..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
              onFocus={() => setShowCustomerDrop(true)}
              onBlur={() => setTimeout(() => setShowCustomerDrop(false), 150)}
            />
            {showCustomerDrop && customerSearch && (
              <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.length > 0 ? filteredCustomers.map((c) => (
                  <div key={getCustomerId(c)} className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer" onMouseDown={() => handleCustomerSelect(c)}>
                    <span className="font-medium">{c.companyName || c.customerName}</span>
                    {c.gstIN && <span className="text-xs text-gray-400 ml-2">{c.gstIN}</span>}
                  </div>
                )) : <div className="px-3 py-2 text-sm text-gray-400">No customers found</div>}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Items</h2>
        <table className="w-full border border-gray-300 border-collapse text-sm mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-center">Sl No</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Qty</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Unit Price</th>
              {/* <th className="border border-gray-300 px-3 py-2 text-center">Discount %</th> */}
              <th className="border border-gray-300 px-3 py-2 text-center">Tax %</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Amount</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-3 py-2 min-w-[220px]">
                  {!item.isManual ? (
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400"
                        placeholder="Search or type item..."
                        value={item.name && !itemSearchQueries[idx] ? item.name : (itemSearchQueries[idx] ?? "")}
                        onChange={(e) => {
                          const q = [...itemSearchQueries]; q[idx] = e.target.value; setItemSearchQueries(q);
                          if (!e.target.value) handleProductSelect(idx, "");
                        }}
                        onFocus={() => { const q = [...itemSearchQueries]; q[idx] = item.name || ""; setItemSearchQueries(q); }}
                        onBlur={() => {
                          const typed = itemSearchQueries[idx];
                          if (typed?.trim()) {
                            setItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: typed.trim() } : it));
                          }
                          const q = [...itemSearchQueries]; q[idx] = ""; setItemSearchQueries(q);
                        }}
                      />
                      {itemSearchQueries[idx] && (() => {
                        const q = itemSearchQueries[idx].toLowerCase();
                        const filtered = (Array.isArray(productData) ? productData : []).filter((p) =>
                          (p.name || "").toLowerCase().includes(q) || (p.hsn || "").toLowerCase().includes(q)
                        );
                        return (
                          <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                            {filtered.length > 0 ? filtered.map((p) => (
                              <div key={p._id?.$oid || p._id || p.name} className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer" onMouseDown={() => handleProductSelect(idx, p)}>
                        <span className="font-medium">{p.name}</span>
                        {(p.sale_price ?? p.salePrice) != null && <span className="text-xs text-gray-400 ml-2">{form.currency} {p.sale_price ?? p.salePrice}</span>}
                      </div>
                    )) : <div className="px-3 py-2 text-sm text-gray-400">No products found</div>}
                    <div className="px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 cursor-pointer border-t border-gray-200" onMouseDown={() => handleProductSelect(idx, "__manual__")}>Other</div>
                  </div>
                );
              })()}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <input type="text" name="name" value={item.name} onChange={(e) => handleItemChange(idx, e)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Enter item name" autoFocus />
                      <button type="button" onClick={() => handleProductSelect(idx, "")} className="text-xs text-blue-500 hover:underline text-left">select from product list</button>
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(idx, e)} className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" placeholder="0" min="0" />
                  {errors[`item_${idx}_qty`] && <p className="text-[11px] text-red-500">{errors[`item_${idx}_qty`]}</p>}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input type="number" name="unitPrice" value={item.unitPrice} onChange={(e) => handleItemChange(idx, e)} className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-gray-700" placeholder="0.00" min="0" />
                </td>
                {/* <td className="border border-gray-300 px-3 py-2 text-center">
                  <input type="number" name="discount" value={item.discount} onChange={(e) => handleItemChange(idx, e)} className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" placeholder="0" min="0" max="100" />
                </td> */}
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input type="number" name="taxRate" value={item.taxRate} onChange={(e) => handleItemChange(idx, e)} className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700" placeholder="0" min="0" max="100" />
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-800">
                  {item.amount.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {idx === items.length - 1 ? (
                    <CirclePlus strokeWidth={1} className="text-green-600 cursor-pointer mx-auto" onClick={addItem} />
                  ) : (
                    <CircleMinus strokeWidth={1} className="text-red-500 cursor-pointer mx-auto" onClick={() => removeItem(idx)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-6 border-b border-gray-300 pb-2">Totals</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Sub Total</span>
              <input readOnly value={`${form.currency} ${subtotal.toFixed(2)}`} className="border border-gray-300 rounded px-2 py-1 w-36 text-right bg-gray-50" />
            </div>
            {parseFloat(form.discount) > 0 && (
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Discount ({form.discount}%)</span>
                <input readOnly value={`- ${form.currency} ${discAmt.toFixed(2)}`} className="border border-gray-300 rounded px-2 py-1 w-36 text-right bg-gray-50 text-red-600" />
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
              <span>Total</span>
              <input readOnly value={`${form.currency} ${total.toFixed(2)}`} className="border border-gray-300 rounded px-2 py-1 w-36 text-right font-bold text-indigo-700" />
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-24 placeholder:text-gray-400" placeholder="Additional notes..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Terms & Conditions</label>
            <textarea name="terms" value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-24 placeholder:text-gray-400" placeholder="Payment terms, validity, etc." />
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end mt-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 mb-16">For FessiT Solutions Private Limited</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
