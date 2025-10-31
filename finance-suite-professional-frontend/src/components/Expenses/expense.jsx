import React, { useState } from "react";

export default function Expense() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file ? file.name : null);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="max-w-5xl mx-auto">

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">Expense Entry</h1>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              💾 Save
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              ⬇️ Download
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              🖨️ Print
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              ✉️ Email
            </button>
          </div>
        </div>

        {/* Expense Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Expense Details
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-6">

            {/* Expense Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Expense Category
              </label>
              <select className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400">
                <option value="">Select a category</option>
                <option>Travel</option>
                <option>Meals</option>
                <option>Supplies</option>
                <option>Software</option>
                <option>Other</option>
              </select>
              <p className="text-xs text-red-500 mt-1">
                Expense category is required
              </p>
            </div>

            {/* Project / Cost Center */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Project / Cost Center
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
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
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
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
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Currency
              </label>
              <select className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400">
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
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
                placeholder="Enter amount"
              />
              <p className="text-xs text-gray-600 mt-1">
                Payable Amount = INR
              </p>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Comment
            </label>
            <textarea
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm h-20 focus:ring-2 focus:ring-blue-400"
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
          <div className="flex justify-end space-x-3 mt-8">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Save Expense
            </button>
            <button className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
