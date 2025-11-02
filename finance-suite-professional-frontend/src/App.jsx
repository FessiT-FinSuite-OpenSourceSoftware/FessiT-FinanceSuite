import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "./shared/Loader/loader";

// lazy imports
const SideBar = lazy(() => import("./shared/SideBar/SideBar"));
const StatsGrid = lazy(() => import("./components/Dashboard"));
const Invoices = lazy(() => import("./components/Invoices"));
const Customers = lazy(() => import("./components/Customers"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const GstCompliance = lazy(() => import("./pages/GstComplainces"));
const TdsCompliance = lazy(() => import("./pages/Tds"));
const Expenses = lazy(() => import("./components/Expenses")); // 👈 new line added
const Settings = lazy(() => import("./components/Settings")); // 👈 new line added

export default function App() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen w-screen">
            <Loader />
          </div>
        }
      >
        <SideBar
          component={
            <Routes>
              <Route path="/" element={<StatsGrid />} />
              <Route path="/dashboard" element={<StatsGrid />} />
              <Route path="/invoices" element={<Invoices />} />
			  <Route path="/purchases" element={<PurchaseOrders />} />
              <Route path="/expenses" element={<Expenses />} /> {/* ✅ fixed */}
              <Route path="/gst" element={<GstCompliance />} />
              <Route path="/tds" element={<TdsCompliance />} />
              <Route path="/customers" element={<Customers />} /> {/* fixed typo */}
              <Route path="/settings" element={<Settings />} />
            </Routes>
          }
        />
      </Suspense>
    </div>
  );
}
