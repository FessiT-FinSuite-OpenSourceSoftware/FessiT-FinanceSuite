import React, { useState } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KeyUri } from "../../shared/key";

const emptyExpenseItem = () => ({
  expenseCategory: "",
  amount: "",
  comment: "",
  receiptFile: null,
  receiptName: "",
  receiptPreviewUrl: "",
});

export default function Expense() {
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

  const nav = useNavigate();

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
      row.receiptName = file ? file.name : "";
      row.receiptPreviewUrl = file ? URL.createObjectURL(file) : "";
      copy[index] = row;
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, emptyExpenseItem()]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
      if (!it.receiptFile)
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
    const formData = new FormData();
    
    // Header fields (common)
    formData.append("expenseTitle", header.expenseTitle);
    formData.append("projectCostCenter", header.projectCostCenter);
    formData.append("expenseDate", header.expenseDate);
    formData.append("currency", header.currency);
    formData.append("notes", header.comment || "");

    // Prepare items array as JSON (without files)
    const itemsData = items.map((item) => ({
      expenseCategory: item.expenseCategory,
      amount: item.amount,
      comment: item.comment || "",
      paymentMethod: "",
      vendor: "",
      billable: false,
      taxAmount: null,
    }));

    formData.append("items", JSON.stringify(itemsData));

    // Append receipt files with indexed names
    items.forEach((item, index) => {
      if (item.receiptFile) {
        formData.append(`receipt_${index}`, item.receiptFile);
      }
    });

    const res = await fetch(`${KeyUri.BACKENDURI}/expenses`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Failed to save expense: ${errorData}`);
    }

    alert("Expense saved successfully");
    setHeader({
      expenseTitle: "",
      projectCostCenter: "",
      expenseDate: "",
      currency: "",
      comment: "",
    });
    setItems([emptyExpenseItem()]);
    nav("/expenses");
  } catch (err) {
    console.error(err);
    alert(err.message || "Something went wrong while saving expense");
  } finally {
    setSaving(false);
  }
};

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
                Add Expenses
              </span>
            </div>
            <div className="flex flex-wrap justify-end mr-5 gap-2 ">
              <button
                className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={onExpenseDataSubmit}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save"}
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

        {/* 🔹 Header section (one title under which multiple expenses) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Expense Title (group) */}
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

          {/* Expense Date (common for all items) */}
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

          {/* Currency (common for all items) */}
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

        {/* Group Comment (applies to all, but per-line comment can override) */}
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
            placeholder="Overall remarks for this expense group"
          ></textarea>
        </div>

        {/* 🔹 Multiple expense line items under the header */}
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
                      Choose File
                    </label>
                    <span className="text-sm text-gray-500">
                      {it.receiptName || "No file chosen"}
                    </span>
                    {it.receiptPreviewUrl && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-blue-600 text-xs underline cursor-pointer"
                        onClick={() =>
                          window.open(it.receiptPreviewUrl, "_blank")
                        }
                      >
                        <Eye className="w-3 h-3" />
                        Preview
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

        {/* Add row button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <CirclePlus className="w-4 h-4" />
            Add another expense
          </button>
        </div>
      </div>
    </>
  );
}
