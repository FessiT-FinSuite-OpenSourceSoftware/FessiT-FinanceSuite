import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "./shared/Loader/loader";

const SideBar = lazy(() => import("./shared/SideBar/SideBar"));
const StatsGrid = lazy(() => import("./components/Dashboard"));
const Invoices = lazy(() => import("./components/Invoices/index"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Expenses = lazy(() => import("./pages/Expenses"));
const GstCompliance = lazy(() => import("./pages/GstComplainces"));
const TdsCompliance = lazy(() => import("./pages/Tds"));
const Customers = lazy(() => import("./pages/Customers"));
const Settings = lazy(() => import("./shared/Settings/settings"));
export default function App() {
  return (
    <div>
      <Suspense
        fallback={
          <div>
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
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/gst" element={<GstCompliance />} />
              <Route path="/tds" element={<TdsCompliance />} />
              <Route path="/cutomers" element={<Customers />} />
              <Route path="/settings" element={<Settings />} />





            </Routes>
          }
        />
      </Suspense>
    </div>
  );
}
