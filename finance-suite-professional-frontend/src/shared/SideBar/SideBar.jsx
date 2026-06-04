import React, { useState, useEffect, useRef, memo } from "react";
import ReactDOM from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { authSelector, logoutUser, clearAuth } from "../../ReduxApi/auth";
import { canRead, Module } from "../../utils/permissions";
import {
  FileText, ShoppingCart, Receipt, TrendingUp, Users, Settings,
  IndianRupee, Bell, Menu, X, ChevronRight, ChevronLeft, ArrowUp,
  UserLockIcon, Layers, FolderKanban, Boxes, LogOut, BookOpen,
  ReceiptText, BarChart2, Package, Truck, UserCheck,
} from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { useTheme } from "../ThemeContext";

const SIDEBAR_EXPANDED_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_STORAGE_KEY = "finsuite-sidebar-collapsed";
const SIDEBAR_SPRING = { type: "spring", stiffness: 320, damping: 34, mass: 0.8 };
const CONTENT_FADE = { duration: 0.18, ease: "easeOut" };

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
      className="fixed bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-black/30 w-40 z-9999 overflow-hidden"
    >
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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
      { id: "dashboard", label: "Dashboard", icon: TrendingUp, module: null },
      { id: "invoices", label: "Sales", icon: FileText, module: Module.Invoice },
      { id: "estimates", label: "Quotations", icon: ReceiptText, module: Module.Invoice },
      { id: "delivery-challans", label: "Delivery Challans", icon: Truck, module: Module.Invoice },
    ],
  },
  {
    key: "reports", label: "Reports",
    items: [
      { id: "ledger", label: "Ledger", icon: BookOpen, module: Module.Invoice },
      { id: "profit-loss", label: "P&L Statement", icon: BarChart2, module: Module.Invoice },
    ],
  },
  {
    key: "operations", label: "Operations",
    items: [
      { id: "purchases", label: "Purchase Orders", icon: ShoppingCart, module: Module.PurchaseOrders },
      { id: "expenses", label: "Expenses", icon: Receipt, module: Module.Expenses },
    ],
  },
  {
    key: "compliance", label: "Compliance",
    items: [
      { id: "gstcompliance", label: "GST ", icon: IndianRupee, module: Module.Invoice },
      { id: "tdscompliance", label: "TDS ", icon: Receipt, module: Module.Invoice },
      { id: "ptcompliance", label: "PT ", icon: IndianRupee, module: Module.Invoice },
    ],
  },
  {
    key: "inventory", label: "Inventory",
    items: [
      { id: "assets", label: "Assets", icon: Package, module: Module.null },
      { id: "items", label: "Items", icon: Boxes, module: Module.Products },
    ],
  },
  {
    key: "master", label: "Organization",
    items: [
      { id: "customers", label: "Customers", icon: Users, module: Module.Customers },
      { id: "projects", label: "Projects", icon: FolderKanban, module: Module.Customers },
      { id: "cost-centers", label: "Cost Centers", icon: Layers, module: Module.Customers },
      // { id: "items",        label: "Items",        icon: Boxes,        module: Module.Products },
      // { id: "assets",       label: "Assets",       icon: Package,      module: null },
      { id: "employees", label: "Employees", icon: UserCheck, module: Module.Users },
    ],
  },

  {
    key: "admin", label: "Settings",
    items: [
      { id: "users", label: "User Management", icon: UserLockIcon, module: Module.Users },
      { id: "settings", label: "Settings", icon: Settings, module: null, adminOnly: true },
    ],
  },
];

const PAGE_TITLES = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/estimates": "Quotations",
  "/ledger": "Ledger",
  "/profit-loss": "P&L Statement",
  "/delivery-challans": "Delivery Challans",
  "/invoices": "Sales Invoices",
  "/purchases": "Purchases",
  "/expenses": "Expenses",
  "/gstcompliance": "Goods and Services Tax",
  "/tdscompliance": "Tax Deducted at Source",
  "/ptcompliance": "Professional Tax",
  "/customers": "Customers",
  "/projects": "Projects",
  "/cost-centers": "Cost Centers",
  "/settings": "Settings",
  "/users": "User Management",
  "/assets": "Assets",
  "/employees": "Employees",
  "/items": "Items",
};

function getPageTitle(pathname) {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  const match = Object.keys(PAGE_TITLES).find((k) => k !== "/" && pathname.includes(k));
  return match ? PAGE_TITLES[match] : "";
}

export default function SideBar({ component }) {
  const { theme } = useTheme();
  const headerIconHoverClass = theme === "dark"
    ? "hover:bg-slate-800 hover:text-slate-200"
    : "hover:bg-gray-100 hover:text-gray-900";
  const sidebarToggleClass = theme === "dark"
    ? "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  const collapsedSidebarToggleClass = theme === "dark"
    ? "border-slate-700 bg-slate-900 text-slate-400 shadow-black/30 hover:bg-slate-800 hover:text-slate-100"
    : "border-gray-200 bg-white text-gray-500 shadow-slate-900/10 hover:bg-gray-100 hover:text-gray-900";

  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [popoverTop, setPopoverTop] = useState(96);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    finance: true, reports: true, operations: true, compliance: true, master: false, admin: false, inventory: false,
  });

  const sidebarRef = useRef(null);
  const modalRef = useRef(null);
  const bellRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuTriggerRef = useRef(null);
  const mainRef = useRef(null);
  const popoverCloseTimerRef = useRef(null);

  const location = useLocation();
  const nav = useNavigate();
  const { user } = useSelector(authSelector);
  const dispatch = useDispatch();
  const sidebarWidth = desktopCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  const expanded = !desktopCollapsed;

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(desktopCollapsed));
    } catch { /* localStorage may be unavailable in restricted environments */ }
  }, [desktopCollapsed]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setHoveredGroup(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
  const EXCLUSIVE_GROUPS = ['inventory', 'master', 'admin'];
  const toggleGroup = (key) => setOpenGroups((p) => {
    const isExclusive = EXCLUSIVE_GROUPS.includes(key);
    if (isExclusive && !p[key]) {
      const closes = Object.fromEntries(EXCLUSIVE_GROUPS.map((k) => [k, false]));
      return { ...p, ...closes, [key]: true };
    }
    return { ...p, [key]: !p[key] };
  });

  const getVisibleItems = (group) => group.items.filter((item) => {
    if (item.adminOnly) return user?.is_admin;
    return item.module === null || canRead(user, item.module);
  });

  const handleNavigate = (id) => {
    nav(`/${id}`);
    setHoveredGroup(null);
    setMobileOpen(false);
  };

  const clearPopoverCloseTimer = () => {
    if (popoverCloseTimerRef.current) {
      window.clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
    }
  };

  const schedulePopoverClose = () => {
    clearPopoverCloseTimer();
    popoverCloseTimerRef.current = window.setTimeout(() => {
      setHoveredGroup(null);
    }, 140);
  };

  const openCollapsedPopover = (key, target) => {
    if (!desktopCollapsed || !target) return;
    clearPopoverCloseTimer();
    const rect = target.getBoundingClientRect();
    const maxTop = Math.max(84, window.innerHeight - 280);
    setPopoverTop(Math.min(Math.max(rect.top - 4, 84), maxTop));
    setHoveredGroup(key);
  };

  const NavItem = ({ item, collapsed = false, inPopover = false }) => {
    const Icon = item.icon;
    const active = isItemActive(item.id);
    const stateClass = theme === "dark"
      ? active
        ? "bg-slate-800 text-indigo-200 ring-1 ring-indigo-400/25 shadow-none"
        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      : active
        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-900/5"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

    return (
      <motion.button
        type="button"
        key={item.id}
        onClick={() => handleNavigate(item.id)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed && !inPopover ? item.label : undefined}
        title={collapsed && !inPopover ? item.label : undefined}
        whileHover={{ x: collapsed || inPopover ? 0 : 2 }}
        whileTap={{ scale: 0.98 }}
        className={`group relative flex w-full items-center rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
          collapsed && !inPopover ? "h-11 justify-center px-0" : "min-h-8 gap-2 px-2 py-1"
        } ${stateClass}`}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500 dark:bg-indigo-300"
            transition={SIDEBAR_SPRING}
          />
        )}
        <motion.span
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          animate={{ scale: active ? 1.04 : 1 }}
          transition={SIDEBAR_SPRING}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </motion.span>
        <AnimatePresence initial={false}>
          {(!collapsed || inPopover) && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={CONTENT_FADE}
              className="truncate font-medium"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  // Shared nav content used in desktop sidebar and responsive drawer
  const NavContent = ({ collapsed = false }) => (
    <nav
      aria-label="Primary navigation"
      className={`finsuite-sidebar-nav sidebar-scrollbar relative overflow-y-auto bg-gray-50/80 dark:bg-slate-950 ${
        collapsed ? "px-2 py-3" : "px-1 py-1.5"
      }`}
      style={{ height: "calc(100vh - 72px)", maxHeight: "calc(100vh - 72px)", overflowY: "auto" }}
    >
      {NAV_GROUPS.map((group) => {
        const visibleItems = getVisibleItems(group);
        if (!visibleItems.length) return null;
        const isOpen = openGroups[group.key];
        const groupActive = visibleItems.some((i) => isItemActive(i.id));
        const GroupIcon = visibleItems.find((item) => isItemActive(item.id))?.icon || visibleItems[0].icon;
        const popoverOpen = collapsed && hoveredGroup === group.key;
        const collapsedGroupStateClass = theme === "dark"
          ? groupActive
            ? "bg-slate-800 text-indigo-200 ring-1 ring-indigo-400/25"
            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
          : groupActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900";

        return (
          <div
            key={group.key}
            className={`relative ${collapsed ? "mb-2" : "mb-1"}`}
            onMouseEnter={(e) => collapsed && openCollapsedPopover(group.key, e.currentTarget)}
            onMouseLeave={() => collapsed && schedulePopoverClose()}
            onFocus={(e) => collapsed && openCollapsedPopover(group.key, e.currentTarget)}
          >
            {collapsed ? (
              <motion.button
                type="button"
                onClick={(e) => {
                  if (hoveredGroup === group.key) setHoveredGroup(null);
                  else openCollapsedPopover(group.key, e.currentTarget);
                }}
                aria-label={group.label}
                aria-expanded={popoverOpen}
                title={group.label}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex h-11 w-full items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${collapsedGroupStateClass}`}
              >
                {groupActive && (
                  <motion.span
                    layoutId="sidebar-collapsed-group-indicator"
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500 dark:bg-indigo-300"
                    transition={SIDEBAR_SPRING}
                  />
                )}
                <GroupIcon size={18} strokeWidth={groupActive ? 2.2 : 1.8} />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isOpen}
                className={`flex min-h-6 w-full items-center justify-between rounded-lg px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-widest outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
                  groupActive
                    ? "text-indigo-600 dark:text-indigo-300"
                    : "text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                <span>{group.label}</span>
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={CONTENT_FADE}>
                  <ChevronRight size={14} />
                </motion.span>
              </button>
            )}

            <AnimatePresence initial={false}>
              {!collapsed && isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-0.5 space-y-px">
                    {visibleItems.map((item) => <NavItem key={item.id} item={item} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {popoverOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.97 }}
                  transition={CONTENT_FADE}
                  className="finsuite-sidebar-popover fixed left-[76px] z-300 min-w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 before:absolute before:-left-3 before:top-0 before:h-full before:w-3 before:content-['']"
                  style={{ top: popoverTop }}
                  onMouseEnter={() => {
                    clearPopoverCloseTimer();
                    setHoveredGroup(group.key);
                  }}
                  onMouseLeave={schedulePopoverClose}
                >
                  <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => <NavItem key={item.id} item={item} inPopover />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  const Logo = ({ showText }) => (
    <div className={`flex items-center min-w-0 ${showText ? "flex-1 gap-2.5" : "shrink-0 gap-3"}`}>
      <div className="relative shrink-0">
        <svg width={showText ? 36 : 28} height={showText ? 36 : 28} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
          <h1 className="text-sm font-bold text-indigo-600 dark:text-indigo-300 leading-tight whitespace-nowrap">Financial Suite</h1>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">by FessiT Solutions</p>
          <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-orange-500 rounded-sm" />

              <div
                className="w-1 h-3 rounded-sm border border-gray-300  dark:border-none"
                style={{ backgroundColor: "#ffffff" }}
              />

              <div className="w-1 h-3 bg-green-600 rounded-sm" />
            </div>
            <span className="text-[10px] text-gray-600 dark:text-slate-300 font-medium tracking-wide">MADE IN INDIA</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-gray-50 dark:bg-slate-950">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <motion.aside
        ref={sidebarRef}
        initial={{ x: -24, opacity: 0, width: sidebarWidth }}
        animate={{ x: 0, opacity: 1, width: sidebarWidth }}
        transition={SIDEBAR_SPRING}
        className="finsuite-sidebar-shell hidden lg:flex shrink-0 bg-white/95 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 h-screen flex-col overflow-visible shadow-sm shadow-slate-900/5 dark:shadow-black/20"
        aria-label="Primary sidebar"
      >
        <div className={`finsuite-sidebar-header relative shrink-0 border-b border-gray-200 dark:border-slate-800 h-[72px] flex items-center ${expanded ? "px-2 justify-between" : "px-0 justify-center"}`}>
          <Logo showText={expanded} />
          <motion.button
            type="button"
            onClick={() => {
              setDesktopCollapsed((current) => !current);
              setHoveredGroup(null);
            }}
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!desktopCollapsed}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`flex shrink-0 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
              expanded
                ? `h-8 w-8 ${sidebarToggleClass}`
                : `absolute -right-3 top-1/2 h-7 w-7 -translate-y-1/2 shadow-md ${collapsedSidebarToggleClass}`
            }`}
          >
            <motion.span animate={{ rotate: desktopCollapsed ? 180 : 0 }} transition={CONTENT_FADE}>
              <ChevronLeft size={18} />
            </motion.span>
          </motion.button>
        </div>
        <NavContent collapsed={desktopCollapsed} />
      </motion.aside>

      {/* ── Mobile drawer overlay ────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-slate-950/35 backdrop-blur-sm dark:bg-black/65 z-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CONTENT_FADE}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      <motion.aside
        className={`finsuite-sidebar-shell lg:hidden fixed top-0 left-0 h-full max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col z-201 shadow-2xl shadow-slate-900/20 dark:shadow-black/50 ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ width: SIDEBAR_EXPANDED_WIDTH, isolation: "isolate" }}
        initial={{ x: -SIDEBAR_EXPANDED_WIDTH, opacity: 0.92 }}
        animate={{ x: mobileOpen ? 0 : -SIDEBAR_EXPANDED_WIDTH, opacity: mobileOpen ? 1 : 0.92 }}
        transition={SIDEBAR_SPRING}
        aria-label="Navigation drawer"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="finsuite-sidebar-header shrink-0 p-4 border-b border-gray-200 dark:border-slate-800 h-[72px] flex justify-between items-center">
          <Logo showText />
          <motion.button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation drawer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X size={20} />
          </motion.button>
        </div>
        <NavContent collapsed={false} />
      </motion.aside>

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
          <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-3 md:px-4 lg:px-6 py-3 md:py-4 sticky z-20 top-0 h-[72px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation drawer"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 dark:text-slate-100">
                    {getPageTitle(location.pathname)}
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400 hidden md:block">
                    Welcome back! Here's your business overview.
                  </p>
                </div>
              </div>

              {/* Bell + Theme Toggle + Profile */}
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  ref={bellRef}
                  onClick={() => setShowNotifications((p) => !p)}
                  className={`p-2 rounded-lg relative text-gray-600 dark:text-slate-400 transition-colors ${headerIconHoverClass}`}
                >
                  <Bell size={20} strokeWidth={1} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                <ThemeToggle />

                <div ref={userMenuTriggerRef} className="relative">
                  <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setShowUserMenu((p) => !p)}>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200 leading-tight">{getDisplayName()}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{user?.role || "User"}</p>
                    </div>
                    <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm shadow-indigo-500/20">
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
            className={`fixed z-125 right-2 md:right-4 lg:right-6 top-[72px] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform origin-[90%_top] ${showNotifications ? "opacity-100 scale-100 translate-y-2" : "opacity-0 scale-90 -translate-y-3 pointer-events-none"
              }`}
          >
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-2xl w-[calc(100vw-1rem)] max-w-xs md:w-72 lg:w-80 border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-100">Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-200">
                  <X size={14} />
                </button>
              </div>
              <div className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 max-h-80 overflow-y-auto space-y-3 bg-white dark:bg-slate-900" onScroll={handleNotifScroll}>
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 transition">
                    <p className="font-medium text-gray-800 dark:text-slate-100">{n.title}</p>
                    <p className="text-gray-600 dark:text-slate-300 text-xs mt-1">{n.message}</p>
                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">{n.time}</p>
                  </div>
                ))}
                {loadingMore && <div className="text-center text-gray-400 dark:text-slate-500 py-2 text-xs">Loading more...</div>}
              </div>
            </div>
          </div>

          <div className="p-1"><PageContent component={component} /></div>
        </main>
      </div>
    </div>
  );
}
