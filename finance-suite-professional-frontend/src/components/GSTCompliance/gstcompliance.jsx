import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGstSummary, gstSummarySelector } from "../../ReduxApi/gstSummary";
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice";
import { fetchIncomingInvoices, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import RecentGSTTransactions from "./RecentGSTTransactions";

const gstReturns = [
  {
    id: 1,
    type: "GSTR-3B",
    period: "October 2025",
    dueDate: "2025-11-20",
    status: "pending",
    amount: 252250,
  },
  {
    id: 2,
    type: "GSTR-1",
    period: "October 2025",
    dueDate: "2025-11-11",
    status: "pending",
    amount: 486750,
  },
  {
    id: 3,
    type: "GSTR-3B",
    period: "September 2025",
    dueDate: "2025-10-18",
    filedDate: "2025-10-18",
    status: "filed",
    amount: 245000,
  },
  {
    id: 4,
    type: "GSTR-1",
    period: "September 2025",
    dueDate: "2025-10-10",
    filedDate: "2025-10-10",
    status: "filed",
    amount: 470000,
  },
  {
    id: 5,
    type: "GSTR-3B",
    period: "August 2025",
    dueDate: "2025-09-19",
    filedDate: "2025-09-19",
    status: "filed",
    amount: 238000,
  },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.$date) return formatDate(value.$date);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseDateForSort = (value) => {
  if (!value) return new Date(0).getTime();
  if (typeof value === "object" && value.$date) return new Date(value.$date).getTime();
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00`).getTime();
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("-");
    return new Date(`${year}-${month}-${day}T00:00:00`).getTime();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const getInvoiceId = (invoice) => {
  if (!invoice) return "";
  if (typeof invoice.id === "string") return invoice.id;
  if (typeof invoice._id === "string") return invoice._id;
  if (invoice._id && typeof invoice._id === "object" && typeof invoice._id.$oid === "string") return invoice._id.$oid;
  return "";
};

const toNumber = (value) => Number(value || 0);

const sumInvoiceTaxes = (items = []) => {
  return items.reduce(
    (acc, item) => {
      // outgoing invoice items store tax as item.cgst.cgstAmount / item.sgst.sgstAmount / item.igst.igstAmount
      acc.cgst += toNumber(item?.cgst?.cgstAmount);
      acc.sgst += toNumber(item?.sgst?.sgstAmount);
      acc.igst += toNumber(item?.igst?.igstAmount);
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );
};

export default function GSTCompliance() {
  const dispatch = useDispatch();
  const { data, isLoading } = useSelector(gstSummarySelector);
  const { invoiceData } = useSelector(invoiceSelector);
  const { data: incomingInvoices } = useSelector(incomingInvoiceSelector);
  const [activeTab, setActiveTab] = useState("returns");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    dispatch(fetchGstSummary());
    dispatch(fetchInvoiceData());
    dispatch(fetchIncomingInvoices());
  }, [dispatch]);

  const outgoing = data?.outgoing_invoice_details || data?.outgoing_invoices || {};
  const incoming = data?.combined_expense_gst || data?.incoming_invoices || {};
  const net = data?.net_gst_payable || {};
  const netPayable = toNumber(net.net_payable);
  const pendingReturnCount = typeof data?.pending_returns === "number" ? data.pending_returns : gstReturns.filter((r) => r.status === "pending").length;

  const recentTransactions = useMemo(() => {
    const outgoingTxns = (Array.isArray(invoiceData) ? invoiceData : [])
      .filter((invoice) => (invoice.status || "").toLowerCase() === "paid")
      .map((invoice) => {
        const itemTaxes = sumInvoiceTaxes(Array.isArray(invoice.items) ? invoice.items : []);
        // outgoing invoice stores totals as totalcgst/totalsgst/totaligst (no underscore)
        const cgst = itemTaxes.cgst || toNumber(invoice.totalcgst);
        const sgst = itemTaxes.sgst || toNumber(invoice.totalsgst);
        const igst = itemTaxes.igst || toNumber(invoice.totaligst);
        const totalGst = cgst + sgst + igst;
        // subTotal = sum of itemTotal = hours*rate (taxable base, no GST)
        const taxable = toNumber(invoice.subTotal || invoice.sub_total);
        const date = invoice.invoice_date || invoice.date || invoice.paid_at || invoice.updated_at || invoice.created_at;

        return {
          id: `out-${getInvoiceId(invoice) || invoice.invoice_number || date}`,
          date,
          invoiceNo: invoice.invoice_number || "-",
          party: invoice.billcustomer_name || invoice.customer_name || invoice.company_name || "-",
          type: "Outwards",
          taxable,
          cgst,
          sgst,
          igst,
          total: totalGst,
        };
      });

    const incomingTxns = (Array.isArray(incomingInvoices) ? incomingInvoices : [])
      .filter((invoice) => (invoice.status || "").toLowerCase() === "paid")
      .map((invoice) => {
        const cgst = toNumber(invoice.total_cgst);
        const sgst = toNumber(invoice.total_sgst);
        const igst = toNumber(invoice.total_igst);
        const totalGst = cgst + sgst + igst;
        const taxableBase = toNumber(invoice.subTotal || invoice.sub_total);
        const totalAmount = toNumber(invoice.total);
        const taxable = taxableBase > 0 ? taxableBase : Math.max(totalAmount - totalGst, 0);
        const date = invoice.invoice_date || invoice.date || invoice.paid_at || invoice.updated_at || invoice.created_at;

        return {
          id: `in-${getInvoiceId(invoice) || invoice.invoice_number || date}`,
          date,
          invoiceNo: invoice.invoice_number || "-",
          party: invoice.vendor_name || invoice.vendor || invoice.company_name || "-",
          type: "Inwards",
          taxable,
          cgst,
          sgst,
          igst,
          total: totalGst,
        };
      });

    return [...outgoingTxns, ...incomingTxns]
      .filter((txn) => txn.date)
      .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
  }, [invoiceData, incomingInvoices]);

  const filteredReturns = filterStatus === "all" ? gstReturns : gstReturns.filter((r) => r.status === filterStatus);

  const handleFileReturn = (returnId) => { alert(`Opening filing interface for return ${returnId}`); };
  const handleViewDetails = (returnId) => { alert(`Viewing details for return ${returnId}`); };
  const handleGenerateReport = () => { alert("GST Report generated successfully!"); };
  const handleReconcile = () => { alert("Starting GST reconciliation..."); };

  return (
    <>
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6">
        {/* Tabs + Action Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <div className="flex">
            {[
              { key: "returns",      label: "Returns" },
              { key: "transactions", label: "Transactions" },
              { key: "compliance",   label: "Compliance" },
              { key: "reports",      label: "Reports" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-1">
            <button onClick={handleGenerateReport} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Export Report
            </button>
            <button onClick={handleReconcile} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Reconcile
            </button>
            <button onClick={() => alert("Opening filing portal...")} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              File Return
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Total GST Collected</h3>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(outgoing.total_gst_collected || 0)}</p>
            {/* <p className="text-xs text-blue-600 mt-1">{`${Number(outgoing.invoice_count || 0)} invoices`}</p> */}
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-2">Input Tax Credit</h3>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(incoming.total_gst_collected || 0)}</p>
            {/* <p className="text-xs text-green-600 mt-1">{`${Number(incoming.invoice_count || 0)} invoices`}</p> */}
          </div>

            <div className="bg-linear-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <h3 className="text-sm font-medium text-purple-700 mb-2">Net GST Payable</h3>
              <p className="text-3xl font-bold text-purple-900">{formatCurrency(netPayable)}</p>
              {/* <p className="text-xs text-red-600 mt-1">
              Outgoing: {formatCurrency(net.outgoing_gst_collected || 0)} | Incoming: {formatCurrency(net.incoming_gst_collected || 0)}
              {net.expense_gst_collected != null ? ` | Expenses: ${formatCurrency(net.expense_gst_collected || 0)}` : ""}
              </p> */}
            </div>

          <div className="bg-linear-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-700 mb-2">Returns Pending</h3>
            <p className="text-3xl font-bold text-orange-900">{pendingReturnCount}</p>
            <p className="text-xs text-orange-600 mt-1">Due this month</p>
          </div>
        </div>

        {activeTab === "returns" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">GST Returns</h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "pending" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus("filed")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterStatus === "filed" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Filed
                </button>
              </div>
            </div>

            {gstReturns.some((r) => r.status === "pending") && (
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

            <div className="space-y-4">
              {filteredReturns.map((ret) => (
                <div key={ret.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
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
                      <div className="text-sm font-medium text-gray-800 mt-1">Amount: {formatCurrency(ret.amount)}</div>
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

        {activeTab === "transactions" && (
          <RecentGSTTransactions transactions={recentTransactions} isLoading={isLoading} />
        )}

        {activeTab === "compliance" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-2">Compliance Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl">📋</div>
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
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white text-2xl">💰</div>
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
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-2xl">📊</div>
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
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white text-2xl">✅</div>
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
