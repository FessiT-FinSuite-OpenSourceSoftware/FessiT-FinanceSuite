import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  FileText,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Users,
  Settings,
  IndianRupee,
  Bell,
  Menu,
  X,
} from "lucide-react";

export default function SideBar({ component }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const nav = useNavigate();

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "purchases", label: "Purchase Orders", icon: ShoppingCart },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "gst", label: "GST Compliance", icon: IndianRupee },
    { id: "tds", label: "TDS Compliance", icon: Receipt },
    { id: "cutomers", label: "Customers", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleNavigate = (id) => {
    nav(`/${id}`);
  };

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-gray-50 ">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600">Finance Suite</h1>
          <p className="text-sm text-gray-500 mt-1">Professional</p>
        </div>
        <nav className="p-4 space-y-2">
          {navigation?.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item?.id}
                onClick={() => handleNavigate(item?.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname.includes(`/${item?.id}`)
                    ? "bg-indigo-50 text-indigo-600 font-medium   border-[#646cff] "
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon size={20} />
                <span>{item?.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="overflow-y-auto ">
          <header className="bg-white border-b border-gray-200 px-6 py-4 sticky  z-10 top-0 right-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {sidebarOpen ? (
                    <X size={20} strokeWidth={1} />
                  ) : (
                    <Menu size={20} strokeWidth={1} />
                  )}
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 capitalize">
                    Dashboard

                  </h2>
                  <p className="text-sm text-gray-500">
                    Welcome back! Here's your business overview.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell size={20} strokeWidth={1} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  AB
                </div>
              </div>
            </div>
          </header>

          <div className="p-6">{component}</div>
        </main>
      </div>
    </div>
  );
}
