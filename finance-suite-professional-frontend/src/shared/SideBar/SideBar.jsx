import React, { useState, useEffect, useRef } from "react";
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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

export default function SideBar({ component }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const location = useLocation();
  const nav = useNavigate();
  const modalRef = useRef(null);
  const bellRef = useRef(null);

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "purchases", label: "Purchase Orders", icon: ShoppingCart },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "gstcompliance", label: "GST Compliance", icon: IndianRupee },
    { id: "tdscompliance", label: "TDS Compliance", icon: Receipt },
    { id: "customers", label: "Customers", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleNavigate = (id) => nav(`/${id}`);

  // Dummy notification generator
  const generateNotifications = (count, startIndex = 1) =>
    Array.from({ length: count }, (_, i) => ({
      id: startIndex + i,
      title: `Notification ${startIndex + i}`,
      message: `This is the message for notification #${startIndex + i}.`,
      time: `${Math.floor(Math.random() * 10 + 1)} mins ago`,
    }));

  useEffect(() => {
    setNotifications(generateNotifications(20));
  }, []);

  // Infinite scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 20 && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setNotifications((prev) => [
          ...prev,
          ...generateNotifications(10, prev.length + 1),
        ]);
        setLoadingMore(false);
      }, 800);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifications = () => setShowNotifications((prev) => !prev);

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-24"
        } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200 h-22 flex justify-between items-center">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo Icon - Always visible */}
            <div className="relative flex-shrink-0">
              <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Circular background */}
                <circle cx="50" cy="50" r="48" fill="#1e40af" opacity="0.1"/>
                
                {/* Graph/Chart element */}
                <path d="M 25 70 L 35 55 L 45 60 L 55 40 L 65 45 L 75 30" 
                      stroke="#1e40af" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                
                {/* Letter F */}
                <path d="M 30 35 L 30 75 M 30 35 L 50 35 M 30 53 L 45 53" 
                      stroke="#0ea5e9" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                
                {/* Letter S integrated */}
                <path d="M 55 38 Q 60 35 65 38 Q 70 41 68 47 Q 66 53 60 55 Q 66 57 68 63 Q 70 69 65 72 Q 60 75 55 72" 
                      stroke="#1e40af" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                
                {/* Accent dots */}
                <circle cx="75" cy="30" r="2.5" fill="#f59e0b"/>
                <circle cx="25" cy="70" r="2.5" fill="#f59e0b"/>
              </svg>
            </div>

            {/* Text content - only visible when sidebar is open */}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-indigo-600 leading-tight">
                  Financial Suite
                </h1>
                <p className="text-[11px] text-gray-500 mt-0.5">by FessiT Solutions</p>
                
                {/* Made in India indicator */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-orange-500 rounded-sm"></div>
                    <div className="w-1 h-3 bg-white border border-gray-300 rounded-sm"></div>
                    <div className="w-1 h-3 bg-green-600 rounded-sm"></div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium tracking-wide">
                    MADE IN INDIA
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle button */}
          <div className="flex-shrink-0 ml-2">
            {sidebarOpen ? (
              <ChevronLeft
                className="cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                size={24}
                strokeWidth={1.5}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              />
            ) : (
              <ChevronRight
                size={24}
                strokeWidth={1.5}
                className="cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              />
            )}
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center  rounded-lg transition-colors ${
                  location.pathname.includes(`/${item.id}`)
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                } sider-button ${sidebarOpen ? "py-3 px-4 space-x-3" : ""}`}
                title={item.label}
              >
                <Icon size={20} />
                <span className={`${sidebarOpen ? "block" : "hidden"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="overflow-y-auto">
          <header className="bg-white border-b border-gray-200 px-6 h-22 py-4 sticky z-10 top-0 right-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="mb-4 ">
                  <h2 className="relative text-2xl font-bold text-gray-800 capitalize ">
                    {location.pathname.includes("/dashboard") && (
                      <p>Dashboard</p>
                    )}
                    {location.pathname.includes("/invoices") && <p>Invoices</p>}
                    {location.pathname.includes("/purchases") && (
                      <p>Purchases</p>
                    )}
                    {location.pathname.includes("/expenses") && <p>Expenses</p>}
                    {location.pathname.includes("/gst") && (
                      <p>GST Complainces</p>
                    )}
                    {location.pathname.includes("/tds") && (
                      <p>TDS Complainces</p>
                    )}
                    {location.pathname.includes("/customers") && (
                      <p>Customers</p>
                    )}
                    {location.pathname.includes("/settings") && <p>Settings</p>}
                  </h2>
                  <p className="text-sm absolute text-gray-500">
                    Welcome back! Here's your business overview.
                  </p>
                </div>
              </div>

              {/* Bell + Profile */}
              <div className="flex items-center space-x-3 relative">
                <button
                  ref={bellRef}
                  onClick={toggleNotifications}
                  className="sider-button p-2 hover:bg-gray-100 rounded-lg relative"
                >
                  <Bell size={20} strokeWidth={1} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Name and Position */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700 leading-tight">
                      Amit Bhatt
                    </p>
                    <p className="text-xs text-gray-500">
                      Finance Manager
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                    AB
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div
            ref={modalRef}
            className={`fixed z-125 right-6 top-16 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform origin-[90%_top] ${
              showNotifications
                ? "opacity-100 scale-100 translate-y-2"
                : "opacity-0 scale-90 -translate-y-3 pointer-events-none"
            }`}
          >
            <div className="bg-white shadow-2xl rounded-2xl w-80 border border-gray-100 overflow-hidden backdrop-blur-sm">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable notifications */}
              <div
                className="px-4 py-3 text-sm text-gray-600 max-h-80 overflow-y-auto space-y-3 bg-white custom-scroll"
                onScroll={handleScroll}
              >
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition"
                  >
                    <p className="font-medium text-gray-800">{n.title}</p>
                    <p className="text-gray-600 text-xs mt-1">{n.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{n.time}</p>
                  </div>
                ))}

                {loadingMore && (
                  <div className="text-center text-gray-400 py-2 text-xs">
                    Loading more...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">{component}</div>
        </main>
      </div>
    </div>
  );
}