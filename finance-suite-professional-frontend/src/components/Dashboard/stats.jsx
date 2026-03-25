import React, { useEffect } from "react";
import { FileText, Receipt, TrendingUp, IndianRupee, CheckCircle, Clock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice";
import { fetchOrganisationByEmail, orgamisationSelector } from "../../ReduxApi/organisation";
import { formatCurrency } from "../../utils/formatNumber";
import useExchangeRates from "../../utils/useExchangeRates";

export default function Stats() {
  const dispatch = useDispatch();
  const { invoiceData } = useSelector(invoiceSelector);
  const { currentOrganisation } = useSelector(orgamisationSelector);

  const orgCurrency = currentOrganisation?.currency || "INR";
  const { convert, loading: ratesLoading } = useExchangeRates(orgCurrency);

  useEffect(() => {
    dispatch(fetchInvoiceData());
    const email = localStorage.getItem("email");
    if (email) dispatch(fetchOrganisationByEmail(email));
  }, [dispatch]);

  const paid = invoiceData.filter(inv => inv.status === "Paid");
  const pending = invoiceData.filter(inv => inv.status === "Created" || inv.status === "Raised" || !inv.status);

  const toBase = (inv) => {
    const currency = inv.currency_type?.trim() || "INR";
    return convert(Number(inv.total) || 0, currency);
  };

  // Total revenue = ALL invoices converted to org currency
  const totalRevenue = invoiceData.reduce((sum, inv) => sum + toBase(inv), 0);

  const fmt = (n) => ratesLoading ? "..." : formatCurrency(n, orgCurrency);

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
      label: "GST Payable",
      value: "₹89,234",
      change: "Due: 20 Oct",
      trend: "warning",
      icon: Receipt,
    },
    {
      label: "TDS Deducted",
      value: "₹45,600",
      change: "This Month",
      trend: "neutral",
      icon: IndianRupee,
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
