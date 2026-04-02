import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useDispatch, useSelector } from "react-redux";
import { expenseSelector, fetchOneExpense, updateExpense } from "../../ReduxApi/expense";
import axiosInstance from "../../utils/axiosInstance";
import { KeyUri } from "../../shared/key";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const calcTax = (amount, pct) => (parseFloat(amount) || 0) * (parseFloat(pct) || 0) / 100;

const toInputDate = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  const parts = ddmmyyyy.split("-");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return "";
  return `${y}-${m}-${d}`;
};

const toStoredDate = (yyyymmdd) => {
  if (!yyyymmdd) return "";
  const parts = yyyymmdd.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (!y || !m || !d || y.length !== 4) return "";
  return `${d}-${m}-${y}`;
};

const emptyExpenseItem = () => ({
  expenseCategory: "",
  expenseDate: "",
  vendor: "",
  paymentMethod: "",
  billable: false,
  amount: "",
  cgstPct: "",
  sgstPct: "",
  igstPct: "",
  comment: "",
  billed_to: "",
  receiptFile: null,
  receiptName: "",
  receiptPreviewUrl: "",
  existingReceiptFile: "",
});

const getExpenseId = (expense) => {
  if (!expense) return "";
  if (typeof expense.id === "string") return expense.id;
  if (typeof expense._id === "string") return expense._id;
  if (expense._id && typeof expense._id === "object" && typeof expense._id.$oid === "string") {
    return expense._id.$oid;
  }
  return "";
};

const buildItemFromExpense = (item = {}) => {
  const amount = Number(item.amount) || 0;
  return {
    expenseCategory: item.expense_category || "",
    expenseDate: toInputDate(item.expense_date || "") || (item.expense_date || ""),
    vendor: item.vendor || "",
    paymentMethod: item.payment_method || "",
    billable: Boolean(item.billable),
    amount: amount.toString(),
    cgstPct: amount > 0 ? (((Number(item.total_cgst) || 0) / amount) * 100).toFixed(2) : "",
    sgstPct: amount > 0 ? (((Number(item.total_sgst) || 0) / amount) * 100).toFixed(2) : "",
    igstPct: amount > 0 ? (((Number(item.total_igst) || 0) / amount) * 100).toFixed(2) : "",
    comment: item.comment || "",
    billed_to: item.billed_to || "",
    receiptFile: null,
    receiptName: item.original_filename || item.receipt_file || "",
    receiptPreviewUrl: "",
    existingReceiptFile: item.receipt_file || "",
  };
};

export default function EditExpense() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { currentExpense, isError } = useSelector(expenseSelector);

  const [header, setHeader] = useState({
    expenseTitle: "",
    projectCostCenter: "",
    submissionDate: "",
    currency: "INR",
    comment: "",
  });
  const [items, setItems] = useState([emptyExpenseItem()]);
  const [inputErrors, setInputErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setInputErrors({});
      setHeader({
        expenseTitle: "",
        projectCostCenter: "",
        submissionDate: "",
        currency: "INR",
        comment: "",
      });
      setItems([emptyExpenseItem()]);
      dispatch(fetchOneExpense(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (isError) {
      setLoading(false);
      setHeader({
        expenseTitle: "",
        projectCostCenter: "",
        submissionDate: "",
        currency: "INR",
        comment: "",
      });
      setItems([emptyExpenseItem()]);
      toast.error("Unable to load expense details");
    }
  }, [isError]);

  useEffect(() => {
    const expenseId = getExpenseId(currentExpense);
    if (!currentExpense || (id && expenseId !== id)) return;

    setHeader({
      expenseTitle: currentExpense.expense_title || "",
      projectCostCenter: currentExpense.project_cost_center || "",
      submissionDate: toInputDate(currentExpense.submission_date || ""),
      currency: currentExpense.items?.[0]?.currency || "INR",
      comment: currentExpense.notes || "",
    });

    const mappedItems = Array.isArray(currentExpense.items) && currentExpense.items.length > 0
      ? currentExpense.items.map((item) => buildItemFromExpense(item))
      : [emptyExpenseItem()];

    setItems(mappedItems);
    setLoading(false);
  }, [currentExpense, id]);

  const viewReceipt = async (filename) => {
    if (!filename) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${KeyUri.BACKENDURI}/expenses/receipt/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch receipt");
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
      toast.error("Unable to preview receipt");
    }
  };

  const renderPdf = useCallback(async (url) => {
    const container = document.getElementById("pdf-container");
    if (!container) return;
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      container.innerHTML = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        container.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      }
    } catch (err) {
      console.error("PDF Render Error:", err);
    }
  }, []);

  useEffect(() => {
    if (previewUrl && previewMime.startsWith("application/pdf")) {
      renderPdf(previewUrl);
    }
  }, [previewUrl, previewMime, renderPdf]);

  const downloadReceipt = async (filename) => {
    if (!filename) return;
    try {
      const response = await axiosInstance.get(`/expenses/receipt/${filename}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download receipt");
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });
  };

  const handleFileChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index].receiptPreviewUrl) {
        URL.revokeObjectURL(copy[index].receiptPreviewUrl);
      }
      copy[index] = {
        ...copy[index],
        receiptFile: file,
        receiptName: file.name,
        receiptPreviewUrl: URL.createObjectURL(file),
      };
      return copy;
    });
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.error("At least one expense item is required");
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const removed = next[index];
      if (removed?.receiptPreviewUrl) URL.revokeObjectURL(removed.receiptPreviewUrl);
      return next.filter((_, i) => i !== index);
    });
  };

  const validate = () => {
    const errors = {};
    if (!header.expenseTitle?.trim()) errors.header_expenseTitle = "Expense Title is required";
    if (!header.projectCostCenter?.trim()) errors.header_projectCostCenter = "Project / Cost center is required";
    if (!header.submissionDate?.trim()) errors.header_submissionDate = "Submission date is required";
    if (!header.currency?.trim()) errors.header_currency = "Currency is required";

    items.forEach((it, idx) => {
      const prefix = `row_${idx}_`;
      if (!it.expenseCategory?.trim()) errors[`${prefix}expenseCategory`] = "Category is required";
      if (!it.amount?.trim()) errors[`${prefix}amount`] = "Amount is required";
      if (!it.receiptFile && !it.existingReceiptFile) errors[`${prefix}receipt`] = "Receipt is required";
    });
    return errors;
  };

  const focusFirstError = (errors) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;

    if (firstKey.startsWith("header_")) {
      const fieldName = firstKey.replace("header_", "");
      const el = document.querySelector(`[data-header="true"][name="${fieldName}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    const [, rowIdxStr, fieldName] = firstKey.split("_");
    const rowIdx = parseInt(rowIdxStr, 10) || 0;
    const el = document.querySelector(`[data-row="${rowIdx}"][name="${fieldName}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  const onExpenseDataSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      focusFirstError(errors);
      return;
    }

    setInputErrors({});
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("expenseTitle", header.expenseTitle);
      formData.append("projectCostCenter", header.projectCostCenter);
      formData.append("submissionDate", toStoredDate(header.submissionDate));
      formData.append("currency", header.currency);
      formData.append("notes", header.comment || "");

      const itemsPayload = items.map((item) => {
        const amount = parseFloat(item.amount) || 0;
        const totalCgst = calcTax(amount, item.cgstPct);
        const totalSgst = calcTax(amount, item.sgstPct);
        const totalIgst = calcTax(amount, item.igstPct);

        return {
          expenseCategory: item.expenseCategory,
          expenseDate: toStoredDate(item.expenseDate) || toStoredDate(header.submissionDate),
          vendor: item.vendor || "",
          paymentMethod: item.paymentMethod || "",
          billable: item.billable || false,
          billedTo: item.billed_to || "",
          currency: header.currency,
          amount,
          totalCgst,
          totalSgst,
          totalIgst,
          comment: item.comment || "",
        };
      });

      formData.append("items", JSON.stringify(itemsPayload));

      items.forEach((item, index) => {
        if (item.receiptFile) {
          formData.append(`receipt_${index}`, item.receiptFile);
        }
      });

      const result = await dispatch(updateExpense(id, formData));
      if (result) {
        nav("/expenses");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Something went wrong while updating expense");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <>
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2 flex items-center gap-2">
            <ArrowLeft strokeWidth={1} onClick={() => nav("/expenses")} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Edit Expense</span>
          </div>
          <div className="flex justify-end mr-5">
            <button
              type="button"
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600 disabled:opacity-50"
              onClick={onExpenseDataSubmit}
              disabled={saving}
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 pb-6 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Expense Details</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Title *</label>
            <input
              type="text"
              name="expenseTitle"
              data-header="true"
              value={header.expenseTitle}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="e.g. Client Visit - Mumbai"
            />
            {inputErrors.header_expenseTitle && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors.header_expenseTitle}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Project / Cost Center *</label>
            <input
              type="text"
              name="projectCostCenter"
              data-header="true"
              value={header.projectCostCenter}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="Enter project or cost center"
            />
            {inputErrors.header_projectCostCenter && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors.header_projectCostCenter}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Submission Date *</label>
            <input
              type="date"
              name="submissionDate"
              data-header="true"
              value={header.submissionDate}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            />
            {inputErrors.header_submissionDate && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors.header_submissionDate}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Currency *</label>
            <select
              name="currency"
              data-header="true"
              value={header.currency}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
            {inputErrors.header_currency && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors.header_currency}</p>}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Overall Comment (optional)</label>
          <textarea
            name="comment"
            data-header="true"
            value={header.comment}
            onChange={handleHeaderChange}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-20 placeholder:text-gray-400"
            placeholder="Overall remarks for this expense"
          />
        </div>

        <div className="space-y-6">
          {items.map((it, idx) => {
            const prefix = `row_${idx}_`;
            return (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="absolute top-2 right-2 text-red-500 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <CircleMinus className="w-4 h-4" /> Remove
                  </button>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Category *</label>
                    <select
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                      name="expenseCategory"
                      data-row={idx}
                      value={it.expenseCategory}
                      onChange={(e) => handleItemChange(idx, e)}
                    >
                      <option value="">Select a category</option>
                      <option value="Travel">Travel</option>
                      <option value="Meals">Meals</option>
                      <option value="Supplies">Supplies</option>
                      <option value="Software">Software</option>
                      <option value="Other">Other</option>
                    </select>
                    {inputErrors[`${prefix}expenseCategory`] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors[`${prefix}expenseCategory`]}</p>}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Date</label>
                    <input
                      type="date"
                      name="expenseDate"
                      data-row={idx}
                      value={it.expenseDate}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor</label>
                    <input
                      type="text"
                      name="vendor"
                      data-row={idx}
                      value={it.vendor}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                      placeholder="Vendor / Merchant name"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select
                      name="paymentMethod"
                      data-row={idx}
                      value={it.paymentMethod}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    >
                      <option value="">Select method</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Billing to</label>
                    <select
                      name="billed_to"
                      data-row={idx}
                      value={it.billed_to}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    >
                      <option value="">Select method</option>
                      <option value="Self">Self</option>
                      <option value="Company">Company</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label>
                    <input
                      type="number"
                      name="amount"
                      data-row={idx}
                      value={it.amount}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-gray-600 mt-1">Payable Amount in {header.currency || "INR"}</p>
                    {inputErrors[`${prefix}amount`] && <p className="absolute text-[13px] top-16 ml-32 text-[#f10404]">{inputErrors[`${prefix}amount`]}</p>}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CGST %</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        name="cgstPct"
                        data-row={idx}
                        value={it.cgstPct}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                        placeholder="e.g. 9"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(it.amount, it.cgstPct).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">SGST %</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        name="sgstPct"
                        data-row={idx}
                        value={it.sgstPct}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                        placeholder="e.g. 9"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(it.amount, it.sgstPct).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">IGST %</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        name="igstPct"
                        data-row={idx}
                        value={it.igstPct}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                        placeholder="e.g. 18"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">= {calcTax(it.amount, it.igstPct).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Tax</label>
                    <input
                      readOnly
                      value={(calcTax(it.amount, it.cgstPct) + calcTax(it.amount, it.sgstPct) + calcTax(it.amount, it.igstPct)).toFixed(2)}
                      className="border border-gray-200 rounded px-3 py-2 w-full text-sm bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sub Total (incl. GST)</label>
                    <input
                      readOnly
                      value={(
                        (parseFloat(it.amount) || 0) +
                        calcTax(it.amount, it.cgstPct) +
                        calcTax(it.amount, it.sgstPct) +
                        calcTax(it.amount, it.igstPct)
                      ).toFixed(2)}
                      className="border border-gray-200 rounded px-3 py-2 w-full text-sm bg-gray-50 text-blue-700 font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id={`billable_${idx}`}
                      checked={it.billable}
                      onChange={(e) => setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], billable: e.target.checked };
                        return copy;
                      })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor={`billable_${idx}`} className="text-sm font-semibold text-gray-700 cursor-pointer">Billable to Client</label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Line Comment (optional)</label>
                  <textarea
                    name="comment"
                    data-row={idx}
                    value={it.comment}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-16 placeholder:text-gray-400"
                    placeholder="Remarks for this line item (if any)"
                  />
                </div>

                <div className="mb-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Receipt *</label>
                  {it.existingReceiptFile && !it.receiptFile && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                      <span className="text-sm text-blue-900">Current: {it.receiptName}</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => viewReceipt(it.existingReceiptFile)}
                          className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(it.existingReceiptFile)}
                          className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      id={`receiptUpload_${idx}`}
                      className="hidden"
                      onChange={(e) => handleFileChange(idx, e)}
                    />
                    <label
                      htmlFor={`receiptUpload_${idx}`}
                      className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
                    >
                      {it.receiptFile || it.existingReceiptFile ? "Change File" : "Choose File"}
                    </label>
                    <span className="text-sm text-gray-500">
                      {it.receiptFile ? it.receiptFile.name : it.existingReceiptFile ? "Using existing receipt" : "No file chosen"}
                    </span>
                    {it.receiptPreviewUrl && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        onClick={() => window.open(it.receiptPreviewUrl, "_blank")}
                      >
                        <Eye className="w-3 h-3" /> Preview New
                      </button>
                    )}
                  </div>
                  {inputErrors[`${prefix}receipt`] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors[`${prefix}receipt`]}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyExpenseItem()])}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <CirclePlus className="w-4 h-4" /> Add another expense
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-200">
          <div className="bg-white w-[80%] h-[85%] rounded-lg shadow-lg relative overflow-auto p-6">
            <button
              onClick={() => {
                setShowPreview(false);
                setPreviewUrl(null);
                setPreviewMime("");
              }}
              className="absolute top-3 right-4 text-xl font-bold"
            >
              X
            </button>
            {previewMime.startsWith("image/") ? (
              <div className="flex items-center justify-center h-full">
                <img src={previewUrl} alt="Receipt" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div id="pdf-container" className="flex flex-col items-center gap-6" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
