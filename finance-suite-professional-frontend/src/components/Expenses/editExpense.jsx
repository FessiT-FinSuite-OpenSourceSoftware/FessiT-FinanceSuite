import React, { useState, useEffect } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyUri } from "../../shared/key";

const emptyExpenseItem = () => ({
  expenseCategory: "",
  amount: "",
  comment: "",
  receiptFile: null,
  receiptName: "",
  receiptPreviewUrl: "",
  existingReceiptFile: null, // To track existing receipt from backend
});

export default function EditExpense() {
  const { id } = useParams();
  const nav = useNavigate();

  // 🔹 Header / group-level fields
  const [header, setHeader] = useState({
    expenseTitle: "",
    projectCostCenter: "",
    expenseDate: "",
    currency: "",
    comment: "",
  });

  // 🔹 Multiple line items under one Expense Title
  const [items, setItems] = useState([emptyExpenseItem()]);
  const [inputErrors, setInputErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch expense data on mount
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${KeyUri.BACKENDURI}/expenses/${id}`);
        if (!res.ok) {
          throw new Error("Failed to load expense");
        }

        const expense = await res.json();

        // Populate header
        setHeader({
          expenseTitle: expense.expense_title || "",
          projectCostCenter: expense.project_cost_center || "",
          expenseDate: expense.items?.[0]?.expense_date || "",
          currency: expense.items?.[0]?.currency || "INR",
          comment: expense.notes || "",
        });

        // Populate items
        if (expense.items && expense.items.length > 0) {
          setItems(
            expense.items.map((item) => ({
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
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load expense");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExpense();
    }
  }, [id]);

  const goBackToExpenses = () => {
    nav("/expenses");
  };

  // Header changes
  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: value }));
  };

  // Line item field changes
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });
  };

  // Receipt file change for a specific row
  const handleFileChange = (index, e) => {
    const file = e.target.files?.[0];
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };
      row.receiptFile = file || null;
      row.receiptName = file ? file.name : row.receiptName;
      row.receiptPreviewUrl = file ? URL.createObjectURL(file) : "";
      copy[index] = row;
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, emptyExpenseItem()]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      alert("At least one expense item is required");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Download existing receipt
  const downloadReceipt = (filename) => {
    if (filename) {
      window.open(`${KeyUri.BACKENDURI}/expenses/receipt/${filename}`, "_blank");
    }
  };

  // Validate header + each item
  const validate = () => {
    const errors = {};

    // Header validations
    if (!header.expenseTitle?.trim())
      errors["header_expenseTitle"] = "Expense Title is required";
    if (!header.projectCostCenter?.trim())
      errors["header_projectCostCenter"] = "Project / Cost center is required";
    if (!header.expenseDate?.trim())
      errors["header_expenseDate"] = "Date is required";
    if (!header.currency?.trim())
      errors["header_currency"] = "Currency is required";

    // Items validations
    items.forEach((it, idx) => {
      const prefix = `row_${idx}_`;
      if (!it.expenseCategory?.trim())
        errors[`${prefix}expenseCategory`] = "Category is required";
      if (!it.amount?.trim())
        errors[`${prefix}amount`] = "Amount is required";
      // Receipt not required if existing receipt exists
      if (!it.receiptFile && !it.existingReceiptFile)
        errors[`${prefix}receipt`] = "Receipt is required";
    });

    return errors;
  };

  const onExpenseDataSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);

      // Scroll to first error
      const firstKey = Object.keys(errors)[0];

      if (firstKey.startsWith("header_")) {
        const fieldName = firstKey.replace("header_", "");
        const el = document.querySelector(`[data-header="true"][name="${fieldName}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      } else if (firstKey.startsWith("row_")) {
        const [_, rowIdxStr, fieldName] = firstKey.split("_");
        const rowIdx = parseInt(rowIdxStr, 10) || 0;
        const el = document.querySelector(
          `[data-row="${rowIdx}"][name="${fieldName}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      return;
    }

    setInputErrors({});
    setSaving(true);

    try {
      // 🔹 For edit, we're updating the main expense
      // Backend stores items as array, so we'll send the first item
      // (If you want to support multiple items, you'll need to update backend logic)
      
      const firstItem = items[0]; // Taking first item for now
      const formData = new FormData();
      
      // header fields (common)
      formData.append("expenseTitle", header.expenseTitle);
      formData.append("projectCostCenter", header.projectCostCenter);
      formData.append("expenseDate", header.expenseDate);
      formData.append("currency", header.currency);
      formData.append("comment", firstItem.comment || header.comment || "");

      // line item fields
      formData.append("expenseCategory", firstItem.expenseCategory);
      formData.append("amount", firstItem.amount);
      formData.append("notes", header.comment);

      // Only append receipt if a new file was selected
      if (firstItem.receiptFile) {
        formData.append("receipt", firstItem.receiptFile);
      }

      const res = await fetch(`${KeyUri.BACKENDURI}/expenses/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to update expense");
      }

      alert("Expense updated successfully");
      nav("/expenses");
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while updating expense");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600">Loading expense...</p>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={goBackToExpenses}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Action Bar */}
      <div
        className="sticky top-[88px]
          w-full sm:w-[90%] md:w-full lg:w-full 
          z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm"
      >
        <div className="">
          <div className="flex justify-between">
            <div className="px-4 py-2 flex items-center gap-2">
              <ArrowLeft
                strokeWidth={1}
                onClick={goBackToExpenses}
                className="cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">
                Edit Expense
              </span>
            </div>
            <div className="flex flex-wrap justify-end mr-5 gap-2">
              <button
                className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={onExpenseDataSubmit}
                disabled={saving}
              >
                {saving ? "Updating..." : "💾 Update"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Form */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
          Expense Details
        </h2>

        {/* 🔹 Header section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Expense Title */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              name="expenseTitle"
              data-header="true"
              value={header.expenseTitle}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="e.g. Client Visit - Mumbai"
            />
            {inputErrors["header_expenseTitle"] && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors["header_expenseTitle"]}
              </p>
            )}
          </div>

          {/* Project / Cost Center */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project / Cost Center *
            </label>
            <input
              type="text"
              name="projectCostCenter"
              data-header="true"
              value={header.projectCostCenter}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="Enter project or cost center"
            />
            {inputErrors["header_projectCostCenter"] && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors["header_projectCostCenter"]}
              </p>
            )}
          </div>

          {/* Expense Date */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              name="expenseDate"
              data-header="true"
              value={header.expenseDate}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
            />
            {inputErrors["header_expenseDate"] && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors["header_expenseDate"]}
              </p>
            )}
          </div>

          {/* Currency */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Currency *
            </label>
            <select
              name="currency"
              data-header="true"
              value={header.currency}
              onChange={handleHeaderChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Select a currency</option>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
            {inputErrors["header_currency"] && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors["header_currency"]}
              </p>
            )}
          </div>
        </div>

        {/* Overall Comment */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Overall Comment (optional)
          </label>
          <textarea
            name="comment"
            data-header="true"
            value={header.comment}
            onChange={handleHeaderChange}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-20 placeholder:text-gray-400"
            placeholder="Overall remarks for this expense"
          ></textarea>
        </div>

        {/* 🔹 Expense line items */}
        <div className="space-y-6">
          {items.map((it, idx) => {
            const prefix = `row_${idx}_`;
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 relative"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="absolute top-2 right-2 text-red-500 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <CircleMinus className="w-4 h-4" />
                    Remove
                  </button>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Expense Category */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Expense Category *
                    </label>
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
                    {inputErrors[`${prefix}expenseCategory`] && (
                      <p className="absolute text-[13px] top-15 text-[#f10404]">
                        {inputErrors[`${prefix}expenseCategory`]}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      data-row={idx}
                      value={it.amount}
                      onChange={(e) => handleItemChange(idx, e)}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Payable Amount in {header.currency || "INR"}
                    </p>
                    {inputErrors[`${prefix}amount`] && (
                      <p className="absolute text-[13px] top-16 ml-32 text-[#f10404]">
                        {inputErrors[`${prefix}amount`]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Line Comment */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Line Comment (optional)
                  </label>
                  <textarea
                    name="comment"
                    data-row={idx}
                    value={it.comment}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-16 placeholder:text-gray-400"
                    placeholder="Remarks for this line item (if any)"
                  ></textarea>
                </div>

                {/* Upload Receipt + Preview */}
                <div className="mb-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Upload Receipt *
                  </label>

                  {/* Show existing receipt info */}
                  {it.existingReceiptFile && !it.receiptFile && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-900">
                          Current: {it.receiptName}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(it.existingReceiptFile)}
                          className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      id={`receiptUpload_${idx}`}
                      className="hidden"
                      name="receipt"
                      data-row={idx}
                      onChange={(e) => handleFileChange(idx, e)}
                    />
                    <label
                      htmlFor={`receiptUpload_${idx}`}
                      className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
                    >
                      {it.receiptFile || it.existingReceiptFile
                        ? "Change File"
                        : "Choose File"}
                    </label>
                    <span className="text-sm text-gray-500">
                      {it.receiptFile
                        ? it.receiptFile.name
                        : it.existingReceiptFile
                        ? "Using existing receipt"
                        : "No file chosen"}
                    </span>
                    {it.receiptPreviewUrl && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        onClick={() => window.open(it.receiptPreviewUrl, "_blank")}
                      >
                        <Eye className="w-3 h-3" />
                        Preview New
                      </button>
                    )}
                  </div>
                  {inputErrors[`${prefix}receipt`] && (
                    <p className="absolute text-[13px] top-15 text-[#f10404]">
                      {inputErrors[`${prefix}receipt`]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add row button - commented out for now since backend handles single item */}
        {/* <div className="mt-6">
          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <CirclePlus className="w-4 h-4" />
            Add another expense
          </button>
        </div> */}
      </div>
    </>
  );
}