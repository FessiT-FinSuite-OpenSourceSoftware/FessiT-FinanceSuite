import React, { useState } from "react";

const initialTDSData = {
  totalTDSDeducted: 325000,
  totalTDSDeposited: 298000,
  pendingDeposit: 27000,
  pendingReturns: 1
};

const tdsReturns = [
  {
    id: 1,
    type: "Form 24Q",
    quarter: "Q2 FY 2025-26",
    period: "Jul-Sep 2025",
    dueDate: "2025-11-14",
    status: "pending",
    amount: 125000
  },
  {
    id: 2,
    type: "Form 26Q",
    quarter: "Q2 FY 2025-26",
    period: "Jul-Sep 2025",
    dueDate: "2025-11-14",
    status: "pending",
    amount: 45000
  },
  {
    id: 3,
    type: "Form 24Q",
    quarter: "Q1 FY 2025-26",
    period: "Apr-Jun 2025",
    dueDate: "2025-07-31",
    filedDate: "2025-07-28",
    status: "filed",
    amount: 118000
  },
  {
    id: 4,
    type: "Form 26Q",
    quarter: "Q1 FY 2025-26",
    period: "Apr-Jun 2025",
    dueDate: "2025-07-31",
    filedDate: "2025-07-29",
    status: "filed",
    amount: 37000
  }
];

const tdsDeductions = [
  {
    id: 1,
    date: "2025-10-28",
    deductee: "Rajesh Kumar",
    pan: "ABCDE1234F",
    section: "194J",
    amount: 50000,
    tdsRate: 10,
    tdsAmount: 5000,
    challan: "CH-2025-001",
    status: "deposited"
  },
  {
    id: 2,
    date: "2025-10-25",
    deductee: "ABC Pvt Ltd",
    pan: "AAABC1234D",
    section: "194C",
    amount: 200000,
    tdsRate: 2,
    tdsAmount: 4000,
    challan: "CH-2025-002",
    status: "deposited"
  },
  {
    id: 3,
    date: "2025-10-20",
    deductee: "Priya Sharma",
    pan: "DEFGH5678K",
    section: "194J",
    amount: 75000,
    tdsRate: 10,
    tdsAmount: 7500,
    challan: "Pending",
    status: "pending"
  },
  {
    id: 4,
    date: "2025-10-15",
    deductee: "XYZ Consultants",
    pan: "XYZAB9876P",
    section: "194C",
    amount: 150000,
    tdsRate: 2,
    tdsAmount: 3000,
    challan: "CH-2025-003",
    status: "deposited"
  },
  {
    id: 5,
    date: "2025-10-10",
    deductee: "Tech Solutions Ltd",
    pan: "MNOPQ4321L",
    section: "194J",
    amount: 100000,
    tdsRate: 10,
    tdsAmount: 10000,
    challan: "CH-2025-004",
    status: "deposited"
  }
];

const challans = [
  {
    id: 1,
    challanNo: "CH-2025-004",
    date: "2025-10-31",
    amount: 25000,
    bsr: "0123456",
    month: "October 2025",
    status: "paid"
  },
  {
    id: 2,
    challanNo: "CH-2025-003",
    date: "2025-10-20",
    amount: 18000,
    bsr: "0123457",
    month: "October 2025",
    status: "paid"
  },
  {
    id: 3,
    challanNo: "CH-2025-002",
    date: "2025-09-30",
    amount: 22000,
    bsr: "0123458",
    month: "September 2025",
    status: "paid"
  },
  {
    id: 4,
    challanNo: "CH-2025-001",
    date: "2025-09-15",
    amount: 15000,
    bsr: "0123459",
    month: "September 2025",
    status: "paid"
  }
];

export default function TDSCompliance() {
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
    ? tdsReturns 
    : tdsReturns.filter(r => r.status === filterStatus);

  const handleFileReturn = (returnId) => {
    alert(`Opening TRACES portal for return ${returnId}`);
  };

  const handleViewDetails = (returnId) => {
    alert(`Viewing details for return ${returnId}`);
  };

  const handleGenerateReport = () => {
    alert("TDS Report generated successfully!");
  };

  const handlePayChallan = () => {
    alert("Redirecting to TIN-NSDL portal for challan payment...");
  };

  return (
    <>
      {/* Fixed Buttons at Top */}
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[98%] xl:max-w-8xl mx-auto">
          {/* Tabs and Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-0">
            {/* TDS Tabs - Left Aligned */}
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
                onClick={() => setActiveTab("deductions")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "deductions"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💰 Deductions
              </button>
              <button
                onClick={() => setActiveTab("challans")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "challans"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🧾 Challans
              </button>
              <button
                onClick={() => setActiveTab("certificates")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "certificates"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📜 Certificates
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
                onClick={handlePayChallan}
              >
                💳 Pay Challan
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full sm:w-auto"
                onClick={() => alert("Opening TRACES portal...")}
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
            <h3 className="text-sm font-medium text-blue-700 mb-2">Total TDS Deducted</h3>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(initialTDSData.totalTDSDeducted)}</p>
            <p className="text-xs text-blue-600 mt-1">This financial year</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-2">Total TDS Deposited</h3>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(initialTDSData.totalTDSDeposited)}</p>
            <p className="text-xs text-green-600 mt-1">Deposited to government</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-700 mb-2">Pending Deposit</h3>
            <p className="text-3xl font-bold text-orange-900">{formatCurrency(initialTDSData.pendingDeposit)}</p>
            <p className="text-xs text-orange-600 mt-1">Due for deposit</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
            <h3 className="text-sm font-medium text-red-700 mb-2">Returns Pending</h3>
            <p className="text-3xl font-bold text-red-900">{initialTDSData.pendingReturns}</p>
            <p className="text-xs text-red-600 mt-1">Due this quarter</p>
          </div>
        </div>

        {/* Returns Tab */}
        {activeTab === "returns" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">
                TDS Returns
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
            {tdsReturns.some(r => r.status === "pending") && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Action Required: Q2 TDS Returns are due on 14th Nov 2025
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
                          {ret.type} - {ret.quarter}
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
                        TDS Amount: {formatCurrency(ret.amount)}
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

        {/* Deductions Tab */}
        {activeTab === "deductions" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              TDS Deductions
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Deductee</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">PAN</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Section</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">TDS Rate</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">TDS Amount</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Challan No.</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsDeductions.map((ded) => (
                    <tr key={ded.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(ded.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{ded.deductee}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{ded.pan}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ded.section}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(ded.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{ded.tdsRate}%</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                        {formatCurrency(ded.tdsAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ded.challan}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold ${
                            ded.status === "deposited"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {ded.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Challans Tab */}
        {activeTab === "challans" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              TDS Challans
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challans.map((challan) => (
                <div
                  key={challan.id}
                  className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800">{challan.challanNo}</h4>
                      <p className="text-sm text-gray-600">BSR Code: {challan.bsr}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold uppercase">
                      {challan.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment Date:</span>
                      <span className="font-medium text-gray-800">{formatDate(challan.date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Month:</span>
                      <span className="font-medium text-gray-800">{challan.month}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600 font-semibold">Amount:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(challan.amount)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => alert(`Downloading challan ${challan.challanNo}`)}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Download Receipt
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">
              TDS Certificates & Forms
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => alert("Generating Form 16...")}
                className="border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-800 mb-2">Form 16</h3>
                <p className="text-sm text-gray-600">TDS certificate for salary</p>
              </button>

              <button
                onClick={() => alert("Generating Form 16A...")}
                className="border-2 border-green-200 rounded-lg p-6 hover:bg-green-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-800 mb-2">Form 16A</h3>
                <p className="text-sm text-gray-600">TDS certificate for other payments</p>
              </button>

              <button
                onClick={() => alert("Generating Form 26AS...")}
                className="border-2 border-purple-200 rounded-lg p-6 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-semibold text-gray-800 mb-2">Form 26AS</h3>
                <p className="text-sm text-gray-600">Annual tax statement</p>
              </button>

              <button
                onClick={() => alert("Generating TDS Summary...")}
                className="border-2 border-orange-200 rounded-lg p-6 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📈</div>
                <h3 className="font-semibold text-gray-800 mb-2">TDS Summary</h3>
                <p className="text-sm text-gray-600">Quarterly TDS summary report</p>
              </button>

              <button
                onClick={() => alert("Generating Deductee List...")}
                className="border-2 border-red-200 rounded-lg p-6 hover:bg-red-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">👥</div>
                <h3 className="font-semibold text-gray-800 mb-2">Deductee List</h3>
                <p className="text-sm text-gray-600">All TDS deductees</p>
              </button>

              <button
                onClick={() => alert("Generating Challan Report...")}
                className="border-2 border-indigo-200 rounded-lg p-6 hover:bg-indigo-50 transition-colors text-left"
              >
                <div className="text-3xl mb-3">🧾</div>
                <h3 className="font-semibold text-gray-800 mb-2">Challan Report</h3>
                <p className="text-sm text-gray-600">All challan payments</p>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}