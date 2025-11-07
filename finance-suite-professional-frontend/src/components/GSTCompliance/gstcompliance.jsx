import React, { useState } from "react";


const initialGSTData = {
  totalCollected: 486750,
  inputTaxCredit: 234500,
  netPayable: 252250,
  pendingReturns: 2
};

const gstReturns = [
  {
    id: 1,
    type: "GSTR-3B",
    period: "October 2025",
    dueDate: "2025-11-20",
    status: "pending",
    amount: 252250
  },
  {
    id: 2,
    type: "GSTR-1",
    period: "October 2025",
    dueDate: "2025-11-11",
    status: "pending",
    amount: 486750
  },
  {
    id: 3,
    type: "GSTR-3B",
    period: "September 2025",
    dueDate: "2025-10-18",
    filedDate: "2025-10-18",
    status: "filed",
    amount: 245000
  },
  {
    id: 4,
    type: "GSTR-1",
    period: "September 2025",
    dueDate: "2025-10-10",
    filedDate: "2025-10-10",
    status: "filed",
    amount: 470000
  },
  {
    id: 5,
    type: "GSTR-3B",
    period: "August 2025",
    dueDate: "2025-09-19",
    filedDate: "2025-09-19",
    status: "filed",
    amount: 238000
  }
];

const transactions = [
  {
    id: 1,
    date: "2025-11-01",
    invoiceNo: "INV-2025-0234",
    party: "ABC Technologies",
    type: "Output",
    taxable: 50000,
    cgst: 4500,
    sgst: 4500,
    igst: 0,
    total: 9000
  },
  {
    id: 2,
    date: "2025-10-28",
    invoiceNo: "BILL-789",
    party: "XYZ Suppliers",
    type: "Input",
    taxable: 30000,
    cgst: 0,
    sgst: 0,
    igst: 5400,
    total: 5400
  },
  {
    id: 3,
    date: "2025-10-25",
    invoiceNo: "INV-2025-0233",
    party: "Global Solutions",
    type: "Output",
    taxable: 75000,
    cgst: 6750,
    sgst: 6750,
    igst: 0,
    total: 13500
  },
  {
    id: 4,
    date: "2025-10-22",
    invoiceNo: "BILL-788",
    party: "Office Mart",
    type: "Input",
    taxable: 15000,
    cgst: 1350,
    sgst: 1350,
    igst: 0,
    total: 2700
  },
  {
    id: 5,
    date: "2025-10-20",
    invoiceNo: "INV-2025-0232",
    party: "Tech Innovations",
    type: "Output",
    taxable: 100000,
    cgst: 0,
    sgst: 0,
    igst: 18000,
    total: 18000
  }
];

export default function GSTCompliance() {
  const [activeTab, setActiveTab] = useState("returns");
  const [filterStatus, setFilterStatus] = useState("all");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredReturns = filterStatus === "all" 
    ? gstReturns 
    : gstReturns.filter(r => r.status === filterStatus);

  const handleFileReturn = (returnId) => {
    alert(`Opening filing interface for return ${returnId}`);
  };

  const handleViewDetails = (returnId) => {
    alert(`Viewing details for return ${returnId}`);
  };

  const handleGenerateReport = () => {
    alert("GST Report generated successfully!");
  };

  const handleReconcile = () => {
    alert("Starting GST reconciliation...");
  };

  return (
    <>
      {/* Fixed Buttons at Top */}
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[98%] xl:max-w-8xl mx-auto">
          {/* Tabs and Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-0">
            {/* GST Tabs - Left Aligned */}
            <div className="flex flex-wrap gap-2 flex-none border-b border-gray-200 pb-0">
              <button
                onClick={() => setActiveTab("returns")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "returns"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📋 Returns
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "transactions"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💳 Transactions
              </button>
              <button
                onClick={() => setActiveTab("compliance")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "compliance"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ✅ Compliance
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "reports"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📊 Reports
              </button>
            </div>

            {/* Action Buttons - Right Aligned */}
            <div className="flex flex-wrap gap-2 justify-end flex-shrink-0 pb-3">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={handleGenerateReport}
              >
                📥 Export Report
              </button>
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
                onClick={handleReconcile}
              >
                🔄 Reconcile
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full sm:w-auto"
                onClick={() => alert("Opening filing portal...")}
              >
                📝 File Return
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
        {/* Dashboard Stats - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Total GST Collected</h3>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(initialGSTData.totalCollected)}</p>
            <p className="text-xs text-blue-600 mt-1">+12.5% from last month</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-2">Input Tax Credit</h3>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(initialGSTData.inputTaxCredit)}</p>
            <p className="text-xs text-green-600 mt-1">+8.3% from last month</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-700 mb-2">Net GST Payable</h3>
            <p className="text-3xl font-bold text-purple-900">{formatCurrency(initialGSTData.netPayable)}</p>
            <p className="text-xs text-red-600 mt-1">-3.2% from last month</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-700 mb-2">Returns Pending</h3>
            <p className="text-3xl font-bold text-orange-900">{initialGSTData.pendingReturns}</p>
            <p className="text-xs text-orange-600 mt-1">Due this month</p>
          </div>
        </div>

        {/* Returns Tab */}
        {activeTab === "returns" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">
                GST Returns
              </h2>
              
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "pending"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus("filed")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "filed"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Filed
                </button>
              </div>
            </div>

            {/* Alert for pending returns */}
            {gstReturns.some(r => r.status === "pending") && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Action Required: GSTR-3B for October 2025 is due on 20th Nov 2025
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Returns List */}
            <div className="space-y-4">
              {filteredReturns.map((ret) => (
                <div
                  key={ret.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-800">
                          {ret.type} - {ret.period}
                        </h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            ret.status === "filed"
                              ? "bg-green-100 text-green-800"
                              : ret.status === "pending"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ret.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {ret.status === "filed" ? (
                          <span>Filed on: {formatDate(ret.filedDate)} • Period: {ret.period}</span>
                        ) : (
                          <span>Due Date: {formatDate(ret.dueDate)} • Period: {ret.period}</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-800 mt-1">
                        Amount: {formatCurrency(ret.amount)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {ret.status === "pending" ? (
                        <button
                          onClick={() => handleFileReturn(ret.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          File Now
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewDetails(ret.id)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              Recent GST Transactions
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Invoice No.</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Party</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Taxable Amount</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">CGST</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">SGST</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">IGST</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Total GST</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(txn.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{txn.invoiceNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{txn.party}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold ${
                            txn.type === "Output"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(txn.taxable)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {txn.cgst > 0 ? formatCurrency(txn.cgst) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {txn.sgst > 0 ? formatCurrency(txn.sgst) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {txn.igst > 0 ? formatCurrency(txn.igst) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                        {formatCurrency(txn.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => alert(`Viewing transaction ${txn.invoiceNo}`)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              Compliance Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    📋
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Monthly Returns</h4>
                    <p className="text-sm text-gray-600">8 of 10 filed this year</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: "80%" }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-right">80% Complete</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    💰
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">GST Payments</h4>
                    <p className="text-sm text-gray-600">All payments up to date</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-600 h-3 rounded-full" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-right">100% Complete</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    📊
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Annual Return</h4>
                    <p className="text-sm text-gray-600">Due: 31 Dec 2025</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-purple-600 h-3 rounded-full" style={{ width: "40%" }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-right">40% Complete</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    ✅
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Reconciliation</h4>
                    <p className="text-sm text-gray-600">Last done: 25 Oct 2025</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-orange-600 h-3 rounded-full" style={{ width: "90%" }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-right">90% Complete</p>
              </div>
            </div>
          </>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              GST Reports & Analytics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => alert("Generating GSTR-1 Report...")}
                className="border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-800 mb-2">GSTR-1 Report</h3>
                <p className="text-sm text-gray-600">Outward supplies report</p>
              </button>

              <button
                onClick={() => alert("Generating GSTR-3B Report...")}
                className="border-2 border-green-200 rounded-lg p-6 hover:bg-green-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-800 mb-2">GSTR-3B Report</h3>
                <p className="text-sm text-gray-600">Monthly summary return</p>
              </button>

              <button
                onClick={() => alert("Generating ITC Report...")}
                className="border-2 border-purple-200 rounded-lg p-6 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">💎</div>
                <h3 className="font-semibold text-gray-800 mb-2">ITC Report</h3>
                <p className="text-sm text-gray-600">Input tax credit summary</p>
              </button>

              <button
                onClick={() => alert("Generating Payment Report...")}
                className="border-2 border-orange-200 rounded-lg p-6 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold text-gray-800 mb-2">Payment Report</h3>
                <p className="text-sm text-gray-600">GST payment history</p>
              </button>

              <button
                onClick={() => alert("Generating Reconciliation Report...")}
                className="border-2 border-red-200 rounded-lg p-6 hover:bg-red-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">🔄</div>
                <h3 className="font-semibold text-gray-800 mb-2">Reconciliation</h3>
                <p className="text-sm text-gray-600">Match books with returns</p>
              </button>

              <button
                onClick={() => alert("Generating Annual Report...")}
                className="border-2 border-indigo-200 rounded-lg p-6 hover:bg-indigo-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-semibold text-gray-800 mb-2">Annual Report</h3>
                <p className="text-sm text-gray-600">Yearly GST summary</p>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}