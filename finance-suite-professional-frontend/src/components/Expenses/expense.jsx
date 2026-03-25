import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, CirclePlus, CircleMinus, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { expenseSelector, fetchExpenseData, createExpense } from "../../ReduxApi/expense";
import { fetchCostCenters, costCenterSelector } from "../../ReduxApi/costCenter";
import { fetchCustomerData } from "../../ReduxApi/customer";
import axiosInstance from "../../utils/axiosInstance";

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
    customerId: "",
    projectCostCenter: "",
    expenseDate: "",
    currency: "",
    comment: "",
  });

  // 🔹 Multiple line items under one Expense Title
  const [items, setItems] = useState([emptyExpenseItem()]);
  const [inputErrors, setInputErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch()
  const nav = useNavigate();
  const { currentExpense } = useSelector(expenseSelector)
  const { costCenters } = useSelector(costCenterSelector)
  const allCostCenters = Array.isArray(costCenters) ? costCenters : []

  const { customersData } = useSelector((state) => state.customer)
  const allCustomers = Array.isArray(customersData) ? customersData : []

  // cost centers filtered to the selected customer
  const customerCostCenters = header.customerId
    ? allCostCenters.filter((cc) => {
        const ccCustId = cc.customerId?.$oid || cc.customerId || ''
        return ccCustId === header.customerId
      })
    : []

  const [ccSearch, setCcSearch] = useState("")
  const [ccOpen, setCcOpen] = useState(false)
  const ccRef = useRef(null)

  const filteredCC = customerCostCenters.filter(
    (cc) =>
      (cc.costCenterNumber || "").toLowerCase().includes(ccSearch.toLowerCase()) ||
      (cc.projectName || "").toLowerCase().includes(ccSearch.toLowerCase())
  )
  
  const goBackToExpenses = () => {
    nav("/expenses");
  };

  useEffect(() => {
    setHeader({ expenseTitle: "", customerId: "", projectCostCenter: "", expenseDate: "", currency: "", comment: "" });
    setItems([emptyExpenseItem()]);
    setInputErrors({});
    setCcSearch("");
  }, []);

  useEffect(() => {
    dispatch(fetchExpenseData())
    dispatch(fetchCostCenters())
    dispatch(fetchCustomerData())
  }, [dispatch])

  // Close CC dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ccRef.current && !ccRef.current.contains(e.target)) setCcOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  
  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    setHeader((prev) => ({ ...prev, customerId, projectCostCenter: '' }))
    setCcSearch('')
  }

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
    
    // Header fields - try to match original working format exactly
    formData.append("expenseTitle", header.expenseTitle);
    formData.append("projectCostCenter", header.projectCostCenter);
    formData.append("customerId", header.customerId);
    formData.append("expenseDate", header.expenseDate);
    formData.append("currency", header.currency);
    formData.append("notes", header.comment || "");

    // Prepare items array as JSON (without files)
    const itemsData = items.map((item) => ({
      expenseCategory: item.expenseCategory,
      amount: parseFloat(item.amount) || 0,
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

    // Add org_email
    const orgEmail = localStorage.getItem('email');
    formData.append('org_email', orgEmail);

    const response = await axiosInstance.post('/expenses', formData);
    toast.success(response.data.message || 'Expense created successfully!');
    dispatch(fetchExpenseData());

    setHeader({ expenseTitle: "", customerId: "", projectCostCenter: "", expenseDate: "", currency: "", comment: "" });
    setItems([emptyExpenseItem()]);
    nav("/expenses");
  } catch (err) {
    console.error('Full error object:', err);
    console.error('Error response:', err.response?.data);
    toast.error(err.response?.data?.message || err.message || "Something went wrong while saving expense");
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
        <div>
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
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                onClick={onExpenseDataSubmit}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Form */}
      <div className="bg-white rounded-lg border-g shadow-lg p-4 pb-6 mt-10">
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

          {/* Customer */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Customer *
            </label>
            <select
              name="customerId"
              data-header="true"
              value={header.customerId}
              onChange={handleCustomerChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Select a customer</option>
              {allCustomers.map((c) => {
                const id = c._id?.$oid || c._id || ''
                return (
                  <option key={id} value={id}>
                    {c.customerName} {c.CustomerCode ? `(${c.CustomerCode})` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Project / Cost Center */}
          <div className="relative" ref={ccRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project / Cost Center *
            </label>
            <div
              className={`border border-gray-300 rounded px-3 py-2 w-full text-sm flex justify-between items-center ${
                header.customerId ? 'cursor-pointer' : 'cursor-not-allowed bg-gray-100'
              }`}
              onClick={() => header.customerId && setCcOpen((p) => !p)}
            >
              <span className={header.projectCostCenter ? "text-gray-800" : "text-gray-400"}>
                {header.projectCostCenter
                  ? (() => {
                      const cc = customerCostCenters.find((c) => c.costCenterNumber === header.projectCostCenter)
                      return cc ? `${cc.costCenterNumber} — ${cc.projectName}` : header.projectCostCenter
                    })()
                  : header.customerId ? "Select a cost center" : "Select a customer first"}
              </span>
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            {ccOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b border-gray-100">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by number or project..."
                    value={ccSearch}
                    onChange={(e) => setCcSearch(e.target.value)}
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none"
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto">
                  {filteredCC.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-400">No cost centers found</li>
                  ) : filteredCC.map((cc) => {
                    const id = cc._id?.$oid || cc._id || cc.id || ""
                    return (
                      <li
                        key={id}
                        onClick={() => {
                          setHeader((p) => ({ ...p, projectCostCenter: cc.costCenterNumber }))
                          setCcOpen(false)
                          setCcSearch("")
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center ${
                          header.projectCostCenter === cc.costCenterNumber ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        <span>{cc.projectName}</span>
                        <span className="text-xs text-gray-400">{cc.costCenterNumber}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
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
