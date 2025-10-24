import React from "react";
import { FileText, Receipt, TrendingUp, IndianRupee } from "lucide-react";
export default function Stats() {
  const stats = [
    {
      label: "Total Revenue",
      value: "₹12,45,680",
      change: "+12.5%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Pending Invoices",
      value: "23",
      change: "₹4,23,450",
      trend: "neutral",
      icon: FileText,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats?.map((stat, idx) => {
          const Icon = stat?.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    stat?.trend === "up"
                      ? "bg-green-50"
                      : stat?.trend === "warning"
                      ? "bg-orange-50"
                      : "bg-blue-50"
                  }`}
                >
                  <Icon
                    className={`${
                      stat?.trend === "up"
                        ? "text-green-600"
                        : stat?.trend === "warning"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                    size={24}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat?.trend === "up"
                      ? "text-green-600"
                      : stat?.trend === "warning"
                      ? "text-orange-600"
                      : "text-gray-600"
                  }`}
                >
                  {stat?.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">
                {stat?.label}
              </h3>
              <p className="text-2xl font-bold text-gray-800">{stat?.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
