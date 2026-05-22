import React, { useState, useEffect, useRef, memo } from "react";
import ReactDOM from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { authSelector, logoutUser, clearAuth } from "../../ReduxApi/auth";
import { canRead, Module } from "../../utils/permissions";
import {
  FileText, ShoppingCart, Receipt, TrendingUp, Users, Settings,
  IndianRupee, Bell, Menu, X, ChevronRight, ChevronLeft, ArrowUp,
  UserLockIcon, Layers, FolderKanban, Boxes, LogOut, BookOpen,
  ReceiptText, BarChart2, Package, Truck, UserCheck,
} from "lucide-react";

function UserMenuPortal({ triggerRef, menuRef, onLogout }) {
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [triggerRef]);
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ top: pos.top, right: pos.right }}
      className="fixed bg-white border border-gray-200 rounded-xl shadow-lg w-40 z-9999 overflow-hidden"
    >
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>,
    document.body
  );
}

const PageContent = memo(({ component }) => (
  <div className="p-1">{component}</div>
));

const NAV_GROUPS = [
  {
    key: "finance", label: "Finance",
    items: [
      { id: "dashboard",         label: "Dashboard",        icon: TrendingUp,   module: null },
      { id: "invoices",          label: "Sales",            icon: FileText,     module: Module.Invoice },
      { id: "estimates",         label: "Quotations",       icon: ReceiptText,  module: Module.Invoice },
      { id: "delivery-challans", label: "Delivery Challans",icon: Truck,        module: Module.Invoice },
    ],
  },
  {
    key: "reports", label: "Reports",
    items: [
      { id: "ledger",      label: "Ledger",        icon: BookOpen,  module: Module.Invoice },
      { id: "profit-loss", label: "P&L Statement", icon: BarChart2, module: Module.Invoice },
    ],
  },
  {
    key: "operations", label: "Operations",
    items: [
      { id: "purchases", label: "Purchase Orders", icon: ShoppingCart, module: Module.PurchaseOrders },
      { id: "expenses",  label: "Expenses",        icon: Receipt,      module: Module.Expenses },
    ],
  },
  {
    key: "compliance", label: "Compliance",
    items: [
      { id: "gstcompliance", label: "GST ", icon: IndianRupee, module: Module.Invoice },
      { id: "tdscompliance", label: "TDS ", icon: Receipt,     module: Module.Invoice },
      { id: "ptcompliance",  label: "PT ",  icon: IndianRupee, module: Module.Invoice },
    ],
  },
   {
    key: "inventory", label: "Inventory",
    items: [
      { id: "assets",    label: "Assets", icon: Package, module: Module.null },
      { id: "items",        label: "Items",        icon: Boxes,        module: Module.Products },
    ],
  },
  {
    key: "master", label: "Organization",
    items: [
      { id: "customers",    label: "Customers",    icon: Users,        module: Module.Customers },
      { id: "projects",     label: "Projects",     icon: FolderKanban, module: Module.Customers },
      { id: "cost-centers", label: "Cost Centers", icon: Layers,       module: Module.Customers },
      // { id: "items",        label: "Items",        icon: Boxes,        module: Module.Products },
      // { id: "assets",       label: "Assets",       icon: Package,      module: null },
      { id: "employees",    label: "Employees",    icon: UserCheck,    module: Module.Users },
    ],
  },
 
  {
    key: "admin", label: "Settings",
    items: [
      { id: "users",    label: "User Management", icon: UserLockIcon, module: Module.Users },
      { id: "settings", label: "Settings",        icon: Settings,     module: null, adminOnly: true },
    ],
  },
];

const PAGE_TITLES = {
  "/":               "Dashboard",
  "/dashboard":      "Dashboard",
  "/estimates":      "Quotations",
  "/ledger":         "Ledger",
  "/profit-loss":    "P&L Statement",
  "/delivery-challans": "Delivery Challans",
  "/invoices":       "Sales Invoices",
  "/purchases":      "Purchases",
  "/expenses":       "Expenses",
  "/gstcompliance":  "GST Compliance",
  "/tdscompliance":  "TDS Compliance",
  "/ptcompliance":   "PT Compliance",
  "/customers":      "Customers",
  "/projects":       "Projects",
  "/cost-centers":   "Cost Centers",
  "/settings":       "Settings",
  "/users":          "User Management",
  "/assets":         "Assets",
  "/employees":      "Employees",
  "/items":          "Items",
};

function getPageTitle(pathname) {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  const match = Object.keys(PAGE_TITLES).find((k) => k !== "/" && pathname.includes(k));
  return match ? PAGE_TITLES[match] : "";
}

export default function SideBar({ component }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    finance: true, reports: true, operations: true, compliance: true, master: false, admin: false,inventory: false,
  });

  const sidebarRef = useRef(null);
  const modalRef = useRef(null);
  const bellRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuTriggerRef = useRef(null);
  const mainRef = useRef(null);

  const location = useLocation();
  const nav = useNavigate();
  const { user } = useSelector(authSelector);
  const dispatch = useDispatch();

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Inert sidebar when modal open
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const check = () => {
      const hasModal = !!document.querySelector('[data-modal-open]');
      if (hasModal) sidebar.setAttribute("inert", "");
      else sidebar.removeAttribute("inert");
    };
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-modal-open"] });
    return () => obs.disconnect();
  }, []);

  // Scroll to top on route change
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [location.pathname]);

  // Show scroll-to-top button
  useEffect(() => {
    const el = mainRef.current;
    const onScroll = () => setShowScrollTop((el?.scrollTop ?? 0) > 300);
    el?.addEventListener("scroll", onScroll);
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  // Click outside to close notifications / user menu
  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target))
        setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target) && userMenuTriggerRef.current && !userMenuTriggerRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Dummy notifications
  const genNotifs = (count, start = 1) =>
    Array.from({ length: count }, (_, i) => ({
      id: start + i,
      title: `Notification ${start + i}`,
      message: `Message for notification #${start + i}.`,
      time: `${Math.floor(Math.random() * 10 + 1)} mins ago`,
    }));

  useEffect(() => { setNotifications(genNotifs(20)); }, []);

  const handleNotifScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 20 && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setNotifications((prev) => [...prev, ...genNotifs(10, prev.length + 1)]);
        setLoadingMore(false);
      }, 800);
    }
  };

  const handleLogout = async () => {
    try { await dispatch(logoutUser()).unwrap(); }
    catch { dispatch(clearAuth()); }
    finally { setShowUserMenu(false); nav("/", { replace: true }); }
  };

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  const isItemActive = (id) =>
    (id === "dashboard" && location.pathname === "/") ||
    location.pathname.includes(`/${id}`);

  const isGroupActive = (group) => group.items.some((i) => isItemActive(i.id));
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // Shared nav content used in both desktop sidebar and mobile drawer
  const NavContent = ({ collapsed = false }) => (
    <nav className="sidebar-scrollbar flex-1 overflow-y-auto bg-gray-50 py-2">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (item.adminOnly) return user?.is_admin;
          return item.module === null || canRead(user, item.module);
        });
        if (!visibleItems.length) return null;
        const isOpen = openGroups[group.key];
        const groupActive = isGroupActive(group);
        return (
          <div key={group.key} className="mb-1">
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  groupActive ? "text-indigo-500" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span>{group.label}</span>
                <ChevronRight size={12} className={isOpen ? "rotate-90" : ""} />
              </button>
            ) : (
              <div className="mx-2 my-1 border-t border-gray-200" />
            )}
            {(isOpen || collapsed) && visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => nav(`/${item.id}`)}
                  className={`w-full flex items-center rounded-lg ${
                    active ? "bg-indigo-50 text-indigo-600 font-medium" : "text-gray-600 hover:bg-gray-100"
                  } sider-button ${collapsed ? "py-2.5 justify-center" : "px-3 py-2 space-x-2 justify-start pl-5"}`}
                >
                  <Icon size={15} className={collapsed ? "mx-auto" : "shrink-0"} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const Logo = ({ showText }) => (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="relative shrink-0">
        <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="48" fill="#1e40af" opacity="0.1" />
          <path d="M 25 70 L 35 55 L 45 60 L 55 40 L 65 45 L 75 30" stroke="#1e40af" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 30 35 L 30 75 M 30 35 L 50 35 M 30 53 L 45 53" stroke="#0ea5e9" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 55 38 Q 60 35 65 38 Q 70 41 68 47 Q 66 53 60 55 Q 66 57 68 63 Q 70 69 65 72 Q 60 75 55 72" stroke="#1e40af" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="75" cy="30" r="2.5" fill="#f59e0b" />
          <circle cx="25" cy="70" r="2.5" fill="#f59e0b" />
        </svg>
      </div>
      <div className={`min-w-0 overflow-hidden transition-opacity duration-200 ${showText ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"}`}>
        <div className="min-w-[150px]">
          <h1 className="text-sm font-bold text-indigo-600 leading-tight whitespace-nowrap">Financial Suite</h1>
          <p className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">by FessiT Solutions</p>
          <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-orange-500 rounded-sm" />
              <div className="w-1 h-3 bg-white border border-gray-300 rounded-sm" />
              <div className="w-1 h-3 bg-green-600 rounded-sm" />
            </div>
            <span className="text-[10px] text-gray-600 font-medium tracking-wide">MADE IN INDIA</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-gray-50">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <div
        ref={sidebarRef}
        className={`hidden md:flex ${desktopOpen ? "w-52" : "w-16"} shrink-0 bg-white border-r border-gray-200 h-screen flex-col transition-[width] duration-200`}
      >
        <div className="shrink-0 p-4 border-b border-gray-200 h-[72px] flex justify-between items-center">
          <Logo showText={desktopOpen} />
          <div className="shrink-0 ml-2">
            {desktopOpen ? (
              <ChevronLeft className="cursor-pointer text-gray-500 hover:text-gray-700" size={20} strokeWidth={1.5} onClick={() => setDesktopOpen(false)} />
            ) : (
              <ChevronRight size={24} strokeWidth={1.5} className="cursor-pointer text-gray-500 hover:text-gray-700 -mr-6" onClick={() => setDesktopOpen(true)} />
            )}
          </div>
        </div>
        <NavContent collapsed={!desktopOpen} />
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[200]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-[201] transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ isolation: "isolate" }}
      >
        <div className="shrink-0 p-4 border-b border-gray-200 flex justify-between items-center">
          <Logo showText />
          <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-gray-700 ml-2">
            <X size={20} />
          </button>
        </div>
        <NavContent collapsed={false} />
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none relative" id="main-scroll-container">

          {showScrollTop && (
            <button
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-6 bg-indigo-500 text-white p-3 font-bold rounded-full shadow-lg z-50"
              aria-label="Scroll to top"
            >
              <ArrowUp size={20} />
            </button>
          )}

          {/* ── Header ─────────────────────────────────────────── */}
          <header className="bg-white border-b border-gray-200 px-3 md:px-4 lg:px-6 py-3 md:py-4 sticky z-20 top-0 h-[72px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
                    {getPageTitle(location.pathname)}
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-500 hidden md:block">
                    Welcome back! Here's your business overview.
                  </p>
                </div>
              </div>

              {/* Bell + Profile */}
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  ref={bellRef}
                  onClick={() => setShowNotifications((p) => !p)}
                  className="p-2 hover:bg-gray-100 rounded-lg relative"
                >
                  <Bell size={20} strokeWidth={1} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                <div ref={userMenuTriggerRef} className="relative">
                  <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setShowUserMenu((p) => !p)}>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-gray-700 leading-tight">{getDisplayName()}</p>
                      <p className="text-xs text-gray-500">{user?.role || "User"}</p>
                    </div>
                    <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {getUserInitials(getDisplayName())}
                    </div>
                  </div>
                  {showUserMenu && <UserMenuPortal triggerRef={userMenuTriggerRef} menuRef={userMenuRef} onLogout={handleLogout} />}
                </div>
              </div>
            </div>
          </header>

          {/* Notifications panel */}
          <div
            ref={modalRef}
            className={`fixed z-[125] right-2 md:right-4 lg:right-6 top-[72px] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform origin-[90%_top] ${
              showNotifications ? "opacity-100 scale-100 translate-y-2" : "opacity-0 scale-90 -translate-y-3 pointer-events-none"
            }`}
          >
            <div className="bg-white shadow-2xl rounded-2xl w-[calc(100vw-1rem)] max-w-xs md:w-72 lg:w-80 border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="px-4 py-3 text-sm text-gray-600 max-h-80 overflow-y-auto space-y-3 bg-white" onScroll={handleNotifScroll}>
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition">
                    <p className="font-medium text-gray-800">{n.title}</p>
                    <p className="text-gray-600 text-xs mt-1">{n.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{n.time}</p>
                  </div>
                ))}
                {loadingMore && <div className="text-center text-gray-400 py-2 text-xs">Loading more...</div>}
              </div>
            </div>
          </div>

          <div className="p-1"><PageContent component={component} /></div>
        </main>
      </div>
    </div>
  );
}
