import React from "react";
import { FileText, Users, ShoppingCart, IndianRupee } from "lucide-react";
import { NavLink } from "react-router-dom";

const actions = [
  {
    to: "/invoices/addInvoice",
    icon: FileText,
    label: "New Invoice",
    color: "text-indigo-600 dark:text-indigo-400",
    hoverBorder:
      "hover:border-indigo-400 dark:hover:border-indigo-500",
  },
  {
    to: "/customers/addCustomer",
    icon: Users,
    label: "Add Customer",
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBorder:
      "hover:border-emerald-400 dark:hover:border-emerald-500",
  },
  {
    to: "/purchases/addPurchaseOrder",
    icon: ShoppingCart,
    label: "Purchase Order",
    color: "text-blue-600 dark:text-blue-400",
    hoverBorder:
      "hover:border-blue-400 dark:hover:border-blue-500",
  },
  {
    to: "/gstcompliance",
    icon: IndianRupee,
    label: "GST Compliance",
    color: "text-orange-600 dark:text-orange-400",
    hoverBorder:
      "hover:border-orange-400 dark:hover:border-orange-500",
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-2 border border-gray-200 dark:border-gray-800 shadow-sm mt-2">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 ml-1">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map(({ to, icon: Icon, label, color, hoverBorder }) => (
          <NavLink
            key={to}
            to={to}
            className={`
              group
              flex flex-col items-center justify-center
              min-h-[70px]
              rounded-xl
              border
              border-gray-200
              dark:border-gray-700
              bg-white
              dark:bg-gray-900
              transition-all duration-200
              hover:bg-gray-50
              dark:hover:bg-gray-800/70
              hover:shadow-sm
              ${hoverBorder}
            `}
          >
            <Icon
              size={24}
              className={`${color} mb-3 transition-transform duration-200 group-hover:scale-110`}
            />

            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-center px-2 text-wrap group-hover:text-[15px]">
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}