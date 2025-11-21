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
const ViewCustomer = lazy(() => import("./components/Customers/viewCustomer"));
const EditCustomer = lazy(() => import("./components/Customers/editCustomer"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Expenses = lazy(() => import("./components/Expenses")); // 👈 keeping this for reference
const Settings = lazy(() => import("./components/Settings"));
const GSTCompliance = lazy(() => import("./components/GSTCompliance"));
const TDSCompliance = lazy(() => import("./components/TDSCompliance"));

// Expense components
const ExpensesList = lazy(() => import("./components/Expenses/expenseList"));
const AddExpense = lazy(() => import("./components/Expenses")); // this is your form (Expense.jsx)
const EditExpense = lazy(() => import("./components/Expenses/editExpense")); // 👈 NEW

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
              
              {/* Invoice Routes */}
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/addInvoice" element={<AddInvoices />} />
              <Route path="/invoices/editInvoice/:id" element={<EditInvoices />} />

              {/* Purchase Orders */}
              <Route path="/purchases" element={<PurchaseOrders />} />
              
              {/* Expense Routes */}
              <Route path="/expenses" element={<ExpensesList />} />
              <Route path="/expenses/addExpense" element={<AddExpense />} />
              <Route path="/expenses/editExpense/:id" element={<EditExpense />} /> {/* 👈 NEW */}
              
              {/* Compliance Routes */}
              <Route path="/tdscompliance" element={<TDSCompliance />} />
              <Route path="/gstcompliance" element={<GSTCompliance />} />
              
              {/* Customer Routes */}
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/addCustomer" element={<CustomerCreation />} />
              <Route path="/customers/editCustomer/:id" element={<EditCustomer />} />
              <Route path="/customers/cutomer/:id" element={<ViewCustomer />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
            </Routes>
          }
        />
      </Suspense>
    </div>
  );
}