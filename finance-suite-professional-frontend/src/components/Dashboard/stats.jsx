import React, { useEffect } from "react";
import { Receipt, TrendingUp, IndianRupee, CheckCircle, Clock, TrendingUpDown, TrendingUpIcon, LucideTrendingUp } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import { fetchGstSummary, gstSummarySelector } from "../../ReduxApi/gstSummary";
import { fetchTdsSummary, tdsSummarySelector } from "../../ReduxApi/tdsSummary";
import { fetchEstimates, estimateSelector } from "../../ReduxApi/estimate";
import { formatCurrency } from "../../utils/formatNumber";

// Convert a single invoice's total to INR using stored rates
const toINR = (inv) => {
  const total = Number(inv.total) || 0;
  const isIntl = inv.invoice_type?.trim().toLowerCase() === "international";
  if (!isIntl) return total; // domestic — already INR

  // Use best available stored rate: conversion_rate (Paid) > approxconversionRate (Issued) > tempconversionRate
  const cr  = Number(inv.conversionRate  || inv.conversion_rate)  || 0;
  const acr = Number(inv.approxconversionRate) || 0;
  const tcr = Number(inv.tempconversionRate)   || 0;
  const rate = cr > 0 ? cr : acr > 0 ? acr : tcr > 0 ? tcr : 1;
  return total * rate;
};

export default function Stats() {
  const dispatch = useDispatch();
  const { invoiceData } = useSelector(invoiceSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);
  const { data: gstData, isLoading: gstLoading } = useSelector(gstSummarySelector);
  const { data: tdsData } = useSelector(tdsSummarySelector);
  const { estimateData } = useSelector(estimateSelector);

  const orgCurrency = currentOrganisation?.currency || "INR";

  useEffect(() => {
    const now = new Date();
    const currentMonth = [{ year: now.getFullYear(), month: now.getMonth() + 1 }];
    dispatch(fetchInvoiceData());
    dispatch(fetchGstSummary(currentMonth));
    dispatch(fetchTdsSummary(currentMonth));
    dispatch(fetchEstimates());
    const email = localStorage.getItem("email");
    if (email) dispatch(fetchOrganisationByEmail(email));
  }, [dispatch]);

  const paid    = invoiceData.filter(inv => inv.status === "Paid");
  const pending = invoiceData.filter(inv =>
    inv.status === "New" || inv.status === "Issued" || inv.status === "On Hold" || !inv.status
  );

  // Total revenue using stored conversion rates — no live API needed
  const totalRevenue = invoiceData.reduce((sum, inv) => sum + toINR(inv), 0);

  const fmt = (n) => formatCurrency(n, "INR");

  const inv = gstData?.outgoing_invoices;
  const inc = gstData?.incoming_invoices;
  const exp = gstData?.expenses;
  const gen = gstData?.general_expenses;
  const combined = gstData?.combined_expense_gst;
  const net = gstData?.net_gst_payable;

  // Total GST collected from outgoing invoices + expenses + general expenses
  const totalGstOut = (inv?.total_gst_collected || 0);
  const totalExpenseGst = (combined?.total_gst_collected || 0);

  const gstCollected = gstLoading
    ? "..."
    : gstData
    ? `₹${totalGstOut.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";

  const totalTdsDeducted = tdsData?.combined?.total_tds_deducted || 0;
  const tdsPending = tdsData?.combined?.tds_pending || 0;
  const tdsMonth = tdsData?.month
    ? new Date(tdsData.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
    : "This Month";

  const estimatedRevenue = (Array.isArray(estimateData) ? estimateData : [])
    .reduce((sum, e) => sum + (Number(e.total) || 0), 0);

  const gstMonth = gstData?.month
    ? new Date(gstData.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
    : "This Month";

  const stats = [
    {
      label: "Total Revenue",
      value: fmt(totalRevenue),
      change: `${invoiceData.length} total invoices`,
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Total Estimates Revenue",
      value: fmt(estimatedRevenue),
      change: `${(Array.isArray(estimateData) ? estimateData : []).length} total estimates`,
      trend: "neutral",
      icon: TrendingUpIcon,
    },
    // {
    //   label: "Paid Invoices",
    //   value: String(paid.length),
    //   change: `of ${invoiceData.length} invoices`,
    //   trend: "neutral",
    //   icon: CheckCircle,
    // },
    {
      label: "Pending",
      value: String(pending.length),
      change: `of ${invoiceData.length} invoices`,
      trend: "danger",
      icon: Clock,
    },
    {
      label: "Total GST Collected",
      value: gstCollected,
      change: `${gstMonth}`,
      trend: "warning",
      icon: Receipt,
      tooltip: gstData ? [
        `Invoices — CGST: ₹${(inv?.total_cgst||0).toFixed(2)} | SGST: ₹${(inv?.total_sgst||0).toFixed(2)} | IGST: ₹${(inv?.total_igst||0).toFixed(2)}`,
        `Expenses — CGST: ₹${(exp?.total_cgst||0).toFixed(2)} | SGST: ₹${(exp?.total_sgst||0).toFixed(2)}`,
        `General — CGST: ₹${(gen?.total_cgst||0).toFixed(2)} | SGST: ₹${(gen?.total_sgst||0).toFixed(2)}`,
      ].join('\n') : "",
    },
    {
      label: "Total TDS Deducted",
      value: tdsData
        ? `₹${totalTdsDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "₹0.00",
      change: tdsMonth,
      trend: "warning",
      icon: IndianRupee,
      tooltip: tdsData ? [
        `Invoices — TDS: ₹${(tdsData.incoming_invoices?.total_tds_deducted||0).toFixed(2)}`,
        `Salaries — TDS: ₹${(tdsData.salaries?.total_tds_deducted||0).toFixed(2)}`,
        `Pending — ₹${tdsPending.toFixed(2)}`,
      ].join('\n') : "",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              title={stat.tooltip || ""}
              className="min-w-0 bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full"
            >
              <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
                <div
                  className={`p-3 rounded-lg ${
                    stat.trend === "up"
                      ? "bg-green-50"
                      : stat.trend === "danger"
                      ? "bg-red-50"
                      : stat.trend === "warning"
                      ? "bg-orange-50"
                      : "bg-blue-50"
                  }`}
                >
                  <Icon
                    className={`${
                      stat.trend === "up"
                        ? "text-green-600"
                        : stat.trend === "danger"
                        ? "text-red-600"
                        : stat.trend === "warning"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                    size={22}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "danger"
                      ? "text-red-600"
                      : stat.trend === "warning"
                      ? "text-orange-600"
                      : "text-gray-600"
                  } max-w-[60%] text-right wrap-break-word leading-tight`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1 leading-tight wrap-break-word">
                {stat.label}
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 wrap-break-word leading-tight tabular-nums">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
