import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "./shared/Loader/loader";

// lazy imports
const SideBar = lazy(() => import("./shared/SideBar/SideBar"));
const StatsGrid = lazy(() => import("./components/Dashboard"));
const Invoices = lazy(() => import("./components/Invoices"));
const AddInvoices = lazy(() => import("./components/Invoices/addInvoice"));
const EditInvoices = lazy(() => import("./components/Invoices/editInvoice"));


const Customers = lazy(() => import("./components/Customers"));
const CustomerCreation = lazy(() => import("./components/Customers/cutsomerCreation"));
const ViewCustomer =lazy(() => import("./components/Customers/viewCustomer"));
const EditCustomer = lazy(() => import("./components/Customers/editCustomer"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Expenses = lazy(() => import("./components/Expenses")); // 👈 new line added
const Settings = lazy(() => import("./components/Settings")); // 👈 new line added
const GSTCompliance = lazy(() => import("./components/GSTCompliance"));
const TDSCompliance = lazy(() => import("./components/TDSCompliance"));

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
              <Route path="/invoices/addInvoice" element={<AddInvoices />} />
              <Route path="/invoices/editInvoice/:id" element={<EditInvoices />} />


			        <Route path="/purchases" element={<PurchaseOrders />} />
              <Route path="/expenses" element={<Expenses />} /> {/* ✅ fixed */}
              <Route path="/tdscompliance" element={<TDSCompliance />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/addCustomer" element={<CustomerCreation />} /> {/* fixed typo */}
              <Route path="/customers/editCustomer/:id" element={<EditCustomer />} />
              <Route path="/customers/cutomer/:id" element={<ViewCustomer />} />

               
               {/* fixed typo */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/gstcompliance" element={<GSTCompliance />} />
            </Routes>
          }
        />
      </Suspense>
    </div>
  );
}
