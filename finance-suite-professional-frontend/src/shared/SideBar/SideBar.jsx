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
        className={`${sidebarOpen ? "w-64" : "w-0"
          } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}
      >
        <div className="p-4  border-b border-gray-200 h-22">
          <h1 className="text-2xl font-bold text-indigo-600">Finance Suite</h1>
          <p className="text-sm text-gray-500 mt-1">Professional</p>
        </div>
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname.includes(`/${item.id}`)
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                  } sider-button`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors sider-button"
                >
                  {sidebarOpen ? (
                    <X size={20} strokeWidth={1} />
                  ) : (
                    <Menu size={20} strokeWidth={1} />
                  )}
                </button>
                <div className="mb-4">
                  <h2 className="relative text-2xl font-bold text-gray-800 capitalize ">
                    {location.pathname.includes('/dashboard')&& (<p>Dashboard</p>)}
                    {location.pathname.includes('/invoices')&& (<p>Invoices</p>)}
                    {location.pathname.includes('/purchases')&& (<p>Purchases</p>)}
                    {location.pathname.includes('/expenses')&& (<p>Expenses</p>)}
                    {location.pathname.includes('/gst')&& (<p>GST Complainces</p>)}
                    {location.pathname.includes('/tds')&& (<p>TDS Complainces</p>)}
                    {location.pathname.includes('/customers')&& (<p>Customers</p>)}
                    {location.pathname.includes('/settings')&& (<p>Settings</p>)}







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

                {/* Notification Modal */}
                <div
                  ref={modalRef}
                  className={`fixed right-6 top-16 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform origin-[90%_top] ${showNotifications
                      ? "opacity-100 scale-100 translate-y-2"
                      : "opacity-0 scale-90 -translate-y-3 pointer-events-none"
                    }`}
                >
                  <div className="bg-white shadow-2xl rounded-2xl w-80 border border-gray-100 overflow-hidden backdrop-blur-sm">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
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
