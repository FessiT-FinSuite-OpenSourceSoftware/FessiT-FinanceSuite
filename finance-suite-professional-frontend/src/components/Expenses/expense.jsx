import React, { useState } from "react";

export default function Expense() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file ? file.name : null);
  };

  return (
    <>
      {/* Action Bar */}
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:max-w-6xl mx-auto">
		<div className="flex flex-wrap justify-end gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            💾 Save
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            ⬇️ Download
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            🖨️ Print
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            ✉️ Email
          </button>
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Category
            </label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full text-sm">
              <option value="">Select a category</option>
              <option>Travel</option>
              <option>Meals</option>
              <option>Supplies</option>
              <option>Software</option>
              <option>Other</option>
            </select>
          </div>

          {/* Project / Cost Center */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project / Cost Center
            </label>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
              placeholder="Enter project or cost center"
            />
          </div>

          {/* Expense Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Title
            </label>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
              placeholder="Short description"
            />
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Expense Date
            </label>
            <input
              type="date"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Currency
            </label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full text-sm">
              <option value="">Select a currency</option>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>JPY</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
              placeholder="Enter amount"
            />
            <p className="text-xs text-gray-600 mt-1">Payable Amount = INR</p>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Comment
          </label>
          <textarea
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-20"
            placeholder="Add remarks or justification for this expense"
          ></textarea>
        </div>

        {/* Upload Receipt */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Upload Receipt
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              id="receiptUpload"
              className="hidden"
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
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save Expense
          </button>
          <button className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
