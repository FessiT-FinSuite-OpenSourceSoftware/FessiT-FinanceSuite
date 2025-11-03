import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialExpenseData = {
  expenseCategory: "",
  projectCostCenter: "",
  expenseTitle: "",
  expenseDate: "",
  currency: "",
  amount: "",
  comment: "",
  receipt: "",
};
export default function Expense() {
  const [expenseData, setExpenseData] = useState(initialExpenseData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputErrors, setInputErrors] = useState({});

  const nav = useNavigate();

  const onExpenseDataChange = (e) => {
    const { name, value } = e.target;
    setExpenseData({ ...expenseData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file ? file.name : null);
    setExpenseData({ ...expenseData, receipt: file });
  };

  const onExpenseDataSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!expenseData.expenseCategory?.trim())
      newErrors.expenseCategory = "Category is required";
    if (!expenseData.projectCostCenter?.trim())
      newErrors.projectCostCenter = "Project / Cost center is required";
    if (!expenseData.expenseTitle?.trim())
      newErrors.expenseTitle = "Title is required";
    if (!expenseData.expenseDate?.trim())
      newErrors.expenseDate = "Date is required";
    if (!expenseData.currency?.trim())
      newErrors.currency = "Currency is required";
    if (!expenseData.amount?.trim()) newErrors.amount = "Amount is required";
    if (!expenseData.receipt) newErrors.receipt = "Receipt is required";

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }
    setInputErrors({});

    console.log(expenseData);
    setExpenseData({ ...initialExpenseData });
    setSelectedFile("");
  };

  const goBackToExpenses = () => {
    nav("/expenses");
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
            <div className="px-4 py-2">
              <ArrowLeft
                strokeWidth={1}
                onClick={goBackToExpenses}
                className=" cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap justify-end  mr-5 gap-2 ">
              <button
                className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={onExpenseDataSubmit}
              >
                💾 Save
              </button>
              <button className="px-4 py-2 cursor-pointer bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto">
                ⬇️ Download
              </button>
              <button className="px-4 py-2 cursor-pointer bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto">
                🖨️ Print
              </button>
              <button className="px-4 py-2 cursor-pointer bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full sm:w-auto">
                ✉️ Email
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Expense Category */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Category *
            </label>
            <select
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
              name="expenseCategory"
              value={expenseData.expenseCategory}
              onChange={onExpenseDataChange}
            >
              <option value="">Select a category</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Supplies">Supplies</option>
              <option value="Software">Software</option>
              <option value="Other">Other</option>
            </select>
            {inputErrors?.expenseCategory && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors?.expenseCategory}
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
              value={expenseData.projectCostCenter}
              name="projectCostCenter"
              onChange={onExpenseDataChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="Enter project or cost center"
            />
            {inputErrors?.projectCostCenter && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors?.projectCostCenter}
              </p>
            )}
          </div>

          {/* Expense Title */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              value={expenseData.expenseTitle}
              name="expenseTitle"
              onChange={onExpenseDataChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="Short description"
            />
            {inputErrors?.expenseTitle && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors?.expenseTitle}
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
              value={expenseData.expenseDate}
              name="expenseDate"
              onChange={onExpenseDataChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
            />
            {inputErrors?.expenseDate && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors?.expenseDate}
              </p>
            )}
          </div>

          {/* Currency */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Currency *
            </label>
            <select
              value={expenseData.currency}
              name="currency"
              onChange={onExpenseDataChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Select a currency</option>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
            {inputErrors?.currency && (
              <p className="absolute text-[13px] top-15 text-[#f10404]">
                {inputErrors?.currency}
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
              value={expenseData.amount}
              name="amount"
              onChange={onExpenseDataChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm placeholder:text-gray-400"
              placeholder="Enter amount"
            />
            <p className="text-xs text-gray-600 mt-1">Payable Amount = INR</p>
            {inputErrors?.amount && (
              <p className="absolute text-[13px] top-16 ml-32 text-[#f10404]">
                {inputErrors?.amount}
              </p>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Comment (optional)
          </label>
          <textarea
            value={expenseData.comment}
            name="comment"
            onChange={onExpenseDataChange}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-20 placeholder:text-gray-400"
            placeholder="Add remarks or justification for this expense"
          ></textarea>
        </div>

        {/* Upload Receipt */}
        <div className="mb-6 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Upload Receipt *
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              id="receiptUpload"
              className="hidden"
              name="receipt"
              // value={expenseData.receipt}
              onChange={handleFileChange}
            />
            <label
              htmlFor="receiptUpload"
              className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
            >
              Choose File
            </label>
            <span className="text-sm text-gray-500">
              {selectedFile ? selectedFile : "No file chosen"}
            </span>
          </div>
          {inputErrors?.receipt && (
            <p className="absolute text-[13px] top-15 text-[#f10404]">
              {inputErrors?.receipt}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
