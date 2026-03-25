import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useDispatch, useSelector } from "react-redux";
import { expenseSelector, fetchOneExpense, updateExpense } from "../../ReduxApi/expense";
import axiosInstance from "../../utils/axiosInstance";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const emptyExpenseItem = () => ({
  expenseCategory: "",
  amount: "",
  comment: "",
  receiptFile: null,
  receiptName: "",
  receiptPreviewUrl: "",
  existingReceiptFile: null,
});

export default function EditExpense() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { currentExpense, loading: reduxLoading } = useSelector(expenseSelector);

  const [header, setHeader] = useState({
    expenseTitle: "",
    projectCostCenter: "",
    expenseDate: "",
    currency: "INR",
    comment: "",
  });

  const [items, setItems] = useState([emptyExpenseItem()]);
  const [inputErrors, setInputErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  console.log("current expense in edit component", currentExpense)
  // Initial Fetch
  useEffect(() => {
    if (id) dispatch(fetchOneExpense(id));
  }, [id, dispatch]);

  // Sync Redux Data to Local State
  useEffect(() => {
    if (currentExpense) {
      setHeader({
        expenseTitle: currentExpense.expense_title || "",
        projectCostCenter: currentExpense.project_cost_center || "",
        expenseDate: currentExpense.items?.[0]?.expense_date || "",
        currency: currentExpense.items?.[0]?.currency || "INR",
        comment: currentExpense.notes || "",
      });

      if (currentExpense.items?.length > 0) {
        setItems(
          currentExpense.items.map((item) => ({
            expenseCategory: item.expense_category || "",
            amount: item.amount?.toString() || "",
            comment: item.comment || "",
            receiptFile: null,
            receiptName: item.original_filename || item.receipt_file || "",
            receiptPreviewUrl: "",
            existingReceiptFile: item.receipt_file || null,
          }))
        );
      }
      setLoading(false);
    }
  }, [currentExpense, id]);

  const viewReceipt = async (filename) => {
    if (!filename) return;
    try {
      const res = await axiosInstance.get(
        `/expenses/receipt/${filename}`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setShowPreview(true);
    } catch (err) {
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
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        container.appendChild(canvas);

        await page.render({ canvasContext: context, viewport }).promise;
      }
    } catch (err) {
      console.error("PDF Render Error:", err);
    }
  }, []);

  useEffect(() => {
    if (previewUrl) {
      renderPdf(previewUrl);
      return () => URL.revokeObjectURL(previewUrl); // Cleanup memory
    }
  }, [previewUrl, renderPdf]);

  const goBackToExpenses = () => nav("/expenses");

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
      // Cleanup previous preview URL if it exists
      if (copy[index].receiptPreviewUrl) URL.revokeObjectURL(copy[index].receiptPreviewUrl);

      copy[index] = {
        ...copy[index],
        receiptFile: file,
        receiptName: file.name,
        receiptPreviewUrl: URL.createObjectURL(file)
      };
      return copy;
    });
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return alert("At least one expense item is required");
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadReceipt = async (filename) => {
    if (!filename) return;
    try {
      const response = await axiosInstance.get(`/expenses/receipt/${filename}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Unable to download receipt");
    }
  };

  const validate = () => {
    const errors = {};
    if (!header.expenseTitle?.trim()) errors["header_expenseTitle"] = "Expense Title is required";
    if (!header.projectCostCenter?.trim()) errors["header_projectCostCenter"] = "Project / Cost center is required";
    if (!header.expenseDate?.trim()) errors["header_expenseDate"] = "Date is required";
    if (!header.currency?.trim()) errors["header_currency"] = "Currency is required";

    items.forEach((it, idx) => {
      const prefix = `row_${idx}_`;
      if (!it.expenseCategory?.trim()) errors[`${prefix}expenseCategory`] = "Category is required";
      if (!it.amount?.trim()) errors[`${prefix}amount`] = "Amount is required";
      if (!it.receiptFile && !it.existingReceiptFile) errors[`${prefix}receipt`] = "Receipt is required";
    });
    return errors;
  };

  const onExpenseDataSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const selector = firstKey.startsWith("header_")
        ? `[data-header="true"][name="${firstKey.replace("header_", "")}"]`
        : `[data-row="${firstKey.split("_")[1]}"][name="${firstKey.split("_")[2]}"]`;

      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    setInputErrors({});
    setSaving(true);

    try {
      const firstItem = items[0];
      const formData = new FormData();
      formData.append("expenseTitle", header.expenseTitle);
      formData.append("projectCostCenter", header.projectCostCenter);
      formData.append("expenseDate", header.expenseDate);
      formData.append("currency", header.currency);
      formData.append("comment", firstItem.comment || header.comment || "");
      formData.append("expenseCategory", firstItem.expenseCategory);
      formData.append("amount", firstItem.amount);
      formData.append("notes", header.comment);

      if (firstItem.receiptFile) formData.append("receipt", firstItem.receiptFile);

      // Use Redux action instead of direct API call
      await dispatch(updateExpense(id, formData));

      nav("/expenses");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong while updating expense");
    } finally {
      setSaving(false);
    }
  };



  return (
    <>
      {/* Action Bar */}
      <div className="sticky top-[88px] w-full sm:w-[90%] md:w-full lg:w-full z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2 flex items-center gap-2">
            <ArrowLeft strokeWidth={1} onClick={goBackToExpenses} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Edit Expense</span>
          </div>
          <div className="flex flex-wrap justify-end mr-5 gap-2">
            <button
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
              onClick={onExpenseDataSubmit}
              disabled={saving}
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {/* Expense Form */}
      <div className="bg-white rounded-lg border-g shadow-lg p-4 pb-6 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Expense Details</h2>

        {/* Header section */}
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
            {inputErrors["header_expenseTitle"] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors["header_expenseTitle"]}</p>}
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
            {inputErrors["header_projectCostCenter"] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors["header_projectCostCenter"]}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expense Date *</label>
            <input
              type="date"
              name="expenseDate"
              data-header="true"
              value={header.expenseDate}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            />
            {inputErrors["header_expenseDate"] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors["header_expenseDate"]}</p>}
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
            {inputErrors["header_currency"] && <p className="absolute text-[13px] top-15 text-[#f10404]">{inputErrors["header_currency"]}</p>}
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

        {/* Expense line items */}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">{header.currency || "INR"}</span>
                      <input
                        type="number"
                        name="amount"
                        data-row={idx}
                        value={it.amount}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="border border-gray-300 rounded pl-12 pr-3 py-2 w-full text-sm"
                        placeholder="Enter amount"
                      />
                    </div>
                    {inputErrors[`${prefix}amount`] && <p className="absolute text-[13px] top-16 ml-32 text-[#f10404]">{inputErrors[`${prefix}amount`]}</p>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Line Comment (optional)</label>
                  <textarea
                    name="comment"
                    data-row={idx}
                    value={it.comment}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="border border-gray-300 rounded px-3 py-2 w-2/3 text-sm h-16"
                    placeholder="Remarks for this line item (if any)"
                  />
                </div>

                <div className="mb-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Receipt *</label>
                  {it.existingReceiptFile && !it.receiptFile && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                      <span className="text-sm text-blue-900">Current: {it.receiptName}</span>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => viewReceipt(it.existingReceiptFile)} className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button type="button" onClick={() => downloadReceipt(it.existingReceiptFile)} className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <input type="file" id={`receiptUpload_${idx}`} className="hidden" onChange={(e) => handleFileChange(idx, e)} />
                    <label htmlFor={`receiptUpload_${idx}`} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm">
                      {it.receiptFile || it.existingReceiptFile ? "Change File" : "Choose File"}
                    </label>
                    <span className="text-sm text-gray-500">{it.receiptFile ? it.receiptFile.name : it.existingReceiptFile ? "Using existing receipt" : "No file chosen"}</span>
                    {it.receiptPreviewUrl && (
                      <button type="button" className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer" onClick={() => window.open(it.receiptPreviewUrl, "_blank")}>
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
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-200">
          <div className="bg-white w-[80%] h-[85%] rounded-lg shadow-lg relative overflow-auto p-6">
            <button onClick={() => { setShowPreview(false); setPreviewUrl(null); }} className="absolute top-3 right-4 text-xl font-bold">✕</button>
            <div id="pdf-container" className="flex flex-col items-center gap-6" />
          </div>
        </div>
      )}
    </>
  );
}