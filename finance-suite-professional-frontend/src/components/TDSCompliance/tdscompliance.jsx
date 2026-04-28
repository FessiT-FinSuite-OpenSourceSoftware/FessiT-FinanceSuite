import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTdsSummary, tdsSummarySelector } from "../../ReduxApi/tdsSummary";
import { fetchSalaries, salarySelector } from "../../ReduxApi/salary";
import { fetchIncomingInvoices, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import TDSDeductions from "./TDSDeductions";
import ChallansTab from "./challans";
import PeriodSelector from "../../shared/PeriodSelector";

const initialTDSData = {
  totalTDSDeducted: 0,
  totalTDSDeposited: 0,
  pendingDeposit: 0,
  pendingReturns: 0
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

export default function TDSCompliance() {
  const [activeTab, setActiveTab] = useState("deductions");
  const [filterStatus, setFilterStatus] = useState("all");
  const dispatch = useDispatch()
  const { data } = useSelector(tdsSummarySelector)
  const { salaryData } = useSelector(salarySelector)
  const { data: incomingInvoices } = useSelector(incomingInvoiceSelector)

  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState([{ year: now.getFullYear(), month: now.getMonth() + 1 }]);

  const handlePeriodChange = (months) => {
    setSelectedMonths(months);
  };

  useEffect(() => {
    if (!selectedMonths.length) return;
    dispatch(fetchTdsSummary(selectedMonths));
  }, [dispatch, selectedMonths])

  useEffect(() => {
    if (!selectedMonths.length) return;
    if (selectedMonths.length === 1) {
      dispatch(fetchSalaries(selectedMonths[0].year, selectedMonths[0].month));
      dispatch(fetchIncomingInvoices(selectedMonths[0].year, selectedMonths[0].month));
    } else {
      dispatch(fetchSalaries());
      dispatch(fetchIncomingInvoices());
    }
  }, [dispatch, selectedMonths])
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

  const dynamicDeductions = useMemo(() => {
    const monthSet = new Set(selectedMonths.map(({ year, month }) =>
      `${year}-${String(month).padStart(2, "0")}`
    ));

    function inSelectedMonths(dateStr) {
      if (!dateStr) return false;
      const raw = String(dateStr).trim();
      if (/^\d{4}-\d{2}/.test(raw)) return monthSet.has(raw.slice(0, 7));
      if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return monthSet.has(`${raw.slice(6,10)}-${raw.slice(3,5)}`);
      // period field is YYYY-MM
      if (/^\d{4}-\d{2}$/.test(raw)) return monthSet.has(raw);
      const d = new Date(raw);
      if (!isNaN(d)) return monthSet.has(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
      return false;
    }

    const salaryRows = (Array.isArray(salaryData) ? salaryData : [])
      .filter((s) => {
        const tds = parseFloat(s.tds || 0);
        if (tds <= 0) return false;
        return inSelectedMonths(s.period);
      })
      .map((s) => {
      const gross = parseFloat(s.gross_salary || 0);
      const tds = parseFloat(s.tds || 0);
      const rate = gross > 0 ? parseFloat(((tds / gross) * 100).toFixed(2)) : 0;
      return {
        id: `sal-${s._id?.$oid || s.emp_id}`,
        date: s.paid_on || (s.period ? `${s.period}-01` : null),
        period: s.period,
        deductee: s.emp_name || "-",
        pan: s.pan || "-",
        section: "192",
        amount: gross,
        tdsRate: rate,
        tdsAmount: tds,
        challan: "-",
        status: s.status === "Paid" ? "deposited" : "pending",
        source: "Salary",
      };
    });

    const invoiceRows = (Array.isArray(incomingInvoices) ? incomingInvoices : [])
      .filter((inv) => inv.tds_applicable === true && inSelectedMonths(inv.invoice_date || inv.paid_on))
      .map((inv) => {
        const gross = parseFloat(inv.subTotal || inv.sub_total || 0);
        const tds = parseFloat(inv.tds_total || inv.total_tds || 0);
        const rate = gross > 0 ? parseFloat(((tds / gross) * 100).toFixed(2)) : 0;
        return {
          id: `inv-${inv._id?.$oid || inv.invoice_number}`,
          date: inv.invoice_date || inv.paid_on,
          deductee: inv.vendor_name || inv.company_name || "-",
          pan: inv.pan || "-",
          section: "194C",
          amount: gross,
          tdsRate: rate,
          tdsAmount: tds,
          challan: "-",
          status: (inv.status || "").toLowerCase() === "paid" ? "deposited" : "pending",
          source: "Invoice",
        };
      });

    return [...salaryRows, ...invoiceRows].sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }, [salaryData, incomingInvoices, selectedMonths]);

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
  console.log("This is what we have received from the backend", data)
  return (
    <>
      {/* Main Content */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6">
        {/* Tabs + Action Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <div className="flex">
            {[
              // { key: "returns",      label: "Returns" },
              { key: "deductions", label: "Deductions" },
              // { key: "challans",     label: "Challans" },
              // { key: "certificates", label: "Certificates" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${activeTab === t.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* <div className="flex gap-2 pb-1">
            <button onClick={handleGenerateReport} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Export Report
            </button>
            <button onClick={handlePayChallan} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Pay Challan
            </button>
            <button onClick={() => alert("Opening TRACES portal...")} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              File Return
            </button>
          </div> */}
        </div>
        {/* Dashboard Stats - Always Visible */}
        <PeriodSelector onChange={handlePeriodChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Total TDS Deducted</h3>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(data?.combined?.total_tds_deducted)}</p>
            <p className="text-xs text-blue-600 mt-1">
              Invoices: {formatCurrency(data?.incoming_invoices?.total_tds_deducted)} · Salaries: {formatCurrency(data?.salaries?.total_tds_deducted)}
            </p>
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-2">Total TDS Deposited</h3>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(initialTDSData.totalTDSDeposited)}</p>
            <p className="text-xs text-green-600 mt-1">Deposited to government</p>
            <p className="text-xs text-green-600 mt-1">(Feature Coming soon)</p>

          </div>

          <div className="bg-linear-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-700 mb-2">Pending Deposit</h3>
            <p className="text-3xl font-bold text-orange-900">{formatCurrency(initialTDSData.pendingDeposit)}</p>
            <p className="text-xs text-orange-600 mt-1">Due for deposit</p>
            <p className="text-xs text-orange-600 mt-1">(Feature Coming soon)</p>

          </div>

          <div className="bg-linear-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
            <h3 className="text-sm font-medium text-red-700 mb-2">Returns Pending</h3>
            <p className="text-3xl font-bold text-red-900">{initialTDSData.pendingReturns}</p>
            <p className="text-xs text-red-600 mt-1">Due this quarter</p>
            <p className="text-xs text-red-600 mt-1">(Feature Coming soon)</p>
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
                  className={`px-3 py-1 rounded-md text-sm font-medium ${filterStatus === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${filterStatus === "pending"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus("filed")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${filterStatus === "filed"
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
                  <div className="shrink-0">
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
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${ret.status === "filed"
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

        {activeTab === "deductions" && (
          <TDSDeductions deductions={dynamicDeductions} selectedMonths={selectedMonths} />
        )}

        {/* Challans Tab */}
        {activeTab === "challans" && (
          <>
            <ChallansTab />
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
