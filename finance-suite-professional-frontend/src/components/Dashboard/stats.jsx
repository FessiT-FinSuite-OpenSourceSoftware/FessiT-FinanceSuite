import React, { useEffect } from "react";
import { Receipt, TrendingUp, IndianRupee, CheckCircle, Clock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import { fetchGstSummary, gstSummarySelector } from "../../ReduxApi/gstSummary";
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

  const orgCurrency = currentOrganisation?.currency || "INR";

  useEffect(() => {
    dispatch(fetchInvoiceData());
    dispatch(fetchGstSummary());
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

  const paidAmount = gstLoading
    ? "..."
    : gstData
    ? `₹${(inv?.paid_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";

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
      label: "Paid Invoices",
      value: String(paid.length),
      change: `of ${invoiceData.length} invoices`,
      trend: "neutral",
      icon: CheckCircle,
    },
    {
      label: "Pending",
      value: String(pending.length),
      change: `of ${invoiceData.length} invoices`,
      trend: "neutral",
      icon: Clock,
    },
    {
      label: "Total GST Collected",
      value: gstCollected,
      change: `${(inv?.invoice_count ?? 0) + (exp?.expense_count ?? 0) + (gen?.expense_count ?? 0)} records · ${gstMonth}`,
      trend: "warning",
      icon: Receipt,
      tooltip: gstData ? [
        `Invoices — CGST: ₹${(inv?.total_cgst||0).toFixed(2)} | SGST: ₹${(inv?.total_sgst||0).toFixed(2)} | IGST: ₹${(inv?.total_igst||0).toFixed(2)}`,
        `Expenses — CGST: ₹${(exp?.total_cgst||0).toFixed(2)} | SGST: ₹${(exp?.total_sgst||0).toFixed(2)}`,
        `General — CGST: ₹${(gen?.total_cgst||0).toFixed(2)} | SGST: ₹${(gen?.total_sgst||0).toFixed(2)}`,
      ].join('\n') : "",
    },
    {
      label: "Paid Amount",
      value: paidAmount,
      change: `${inv?.paid_invoice_count ?? 0} paid invoices · ${gstMonth}`,
      trend: "up",
      icon: IndianRupee,
      tooltip: gstData ? `Sum of all Paid invoices generated in ${gstMonth}` : "",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              title={stat.tooltip || ""}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    stat.trend === "up"
                      ? "bg-green-50"
                      : stat.trend === "warning"
                      ? "bg-orange-50"
                      : "bg-blue-50"
                  }`}
                >
                  <Icon
                    className={`${
                      stat.trend === "up"
                        ? "text-green-600"
                        : stat.trend === "warning"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                    size={24}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "warning"
                      ? "text-orange-600"
                      : "text-gray-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.label}</h3>
              <p className="text-xl font-bold text-gray-800 break-all leading-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
