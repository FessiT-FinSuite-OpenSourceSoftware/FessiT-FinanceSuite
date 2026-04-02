import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "./shared/Loader/loader";
import { useSelector, useDispatch } from "react-redux";
import { authSelector, verifyToken, fetchUserProfile } from "./ReduxApi/auth";
import { canRead, Module } from "./utils/permissions";
import Forbidden from "./pages/Forbidden";

// lazy imports
const SideBar = lazy(() => import("./shared/SideBar/SideBar"));
const StatsGrid = lazy(() => import("./components/Dashboard"));
const Invoices = lazy(() => import("./components/Invoices"));
const AddInvoices = lazy(() => import("./components/Invoices/addInvoice"));
const AddIncomingInvoice = lazy(() => import("./components/Invoices/addIncomingInvoice"));
const EditIncomingInvoice = lazy(() => import("./components/Invoices/editIncomingInvoice"));
const IncomingInvoiceView = lazy(() => import("./components/Invoices/IncomingInvoiceView"));
const EditInvoices = lazy(() => import("./components/Invoices/editInvoice"));
const Login = lazy(() => import("./pages/Auth Pages/login"));
const Customers = lazy(() => import("./components/Customers"));
const CustomerCreation = lazy(() => import("./components/Customers/cutsomerCreation"));
const ViewCustomer = lazy(() => import("./components/Customers/viewCustomer"));
const EditCustomer = lazy(() => import("./components/Customers/editCustomer"));
const PurchaseOrders = lazy(() => import("./components/PurchaseOrders"));
const EditpurchaseOrder = lazy(() => import("./components/PurchaseOrders/edit_po"));
const AddPurchaseOrder = lazy(() => import("./components/PurchaseOrders/add_PO"));
const Expenses = lazy(() => import("./components/Expenses"));
const Settings = lazy(() => import("./components/Settings"));
const GSTCompliance = lazy(() => import("./components/GSTCompliance"));
const TDSCompliance = lazy(() => import("./components/TDSCompliance"));
const Users = lazy(() => import("./components/User"));
const EditUser = lazy(() => import("./components/User/EditUser"));
const AddUser = lazy(() => import("./components/User/UserCreation"));
const ExpensesList = lazy(() => import("./components/Expenses/expenseList"));
const AddExpense = lazy(() => import("./components/Expenses"));
const EditExpense = lazy(() => import("./components/Expenses/editExpense"));
const Projects = lazy(() => import('./components/Projects'));

const CreateOrganization = lazy(() => import("./pages/Auth Pages/create_org"));
const CostCenterList = lazy(() => import("./components/CostCenter/CostCenterList"));
const AddCostCenter = lazy(() => import("./components/CostCenter/AddCostCenter"));
const EditCostCenter = lazy(() => import("./components/CostCenter/EditCostCenter"));

function ProtectedRoute({ user, module, children }) {
  if (!canRead(user, module)) return <Forbidden />;
  return children;
}

export default function App() {
  const { isAuthenticated, isLoading, token, user } = useSelector(authSelector);
  const dispatch = useDispatch();

  // Check for existing token on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && !isAuthenticated) {
      // Verify the stored token
      dispatch(verifyToken());
    }
  }, [dispatch, isAuthenticated]);

  // Fetch user profile after successful authentication (only if user data is missing)
  useEffect(() => {
    if (isAuthenticated && token && !isLoading && !user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated, token, isLoading, user]);



  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Loader />
      </div>
    );
  }

  // Show login/auth pages if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen w-screen">
            <Loader />
          </div>
        }
      >
        <div className="h-screen w-screen">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create-organization" element={<CreateOrganization />} />
          </Routes>
        </div>
      </Suspense>
    );
  }

  // Show main app if authenticated
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
              <Route path="/invoices" element={<ProtectedRoute user={user} module={Module.Invoice}><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/addInvoice" element={<ProtectedRoute user={user} module={Module.Invoice}><AddInvoices /></ProtectedRoute>} />
              <Route path="/expenses/addIncomingInvoice" element={<ProtectedRoute user={user} module={Module.Invoice}><AddIncomingInvoice /></ProtectedRoute>} />
              <Route path="/expenses/editIncomingInvoice/:id" element={<ProtectedRoute user={user} module={Module.Invoice}><EditIncomingInvoice /></ProtectedRoute>} />
              <Route path="/expenses/viewIncomingInvoice/:id" element={<ProtectedRoute user={user} module={Module.Invoice}><IncomingInvoiceView /></ProtectedRoute>} />
              <Route path="/invoices/editInvoice/:id" element={<ProtectedRoute user={user} module={Module.Invoice}><EditInvoices /></ProtectedRoute>} />

              {/* Purchase Orders */}
              <Route path="/purchases" element={<ProtectedRoute user={user} module={Module.PurchaseOrders}><PurchaseOrders /></ProtectedRoute>} />
              <Route path="/purchases/editPurchaseOrder/:id" element={<ProtectedRoute user={user} module={Module.PurchaseOrders}><EditpurchaseOrder /></ProtectedRoute>} />
              <Route path="/purchases/addPurchaseOrder" element={<ProtectedRoute user={user} module={Module.PurchaseOrders}><AddPurchaseOrder /></ProtectedRoute>} />

              {/* Expense Routes */}
              <Route path="/expenses" element={<ProtectedRoute user={user} module={Module.Expenses}><ExpensesList /></ProtectedRoute>} />
              <Route path="/expenses/addExpense" element={<ProtectedRoute user={user} module={Module.Expenses}><AddExpense /></ProtectedRoute>} />
              <Route path="/expenses/editExpense/:id" element={<ProtectedRoute user={user} module={Module.Expenses}><EditExpense /></ProtectedRoute>} />

              {/* Compliance Routes */}
              <Route path="/tdscompliance" element={<TDSCompliance />} />
              <Route path="/gstcompliance" element={<GSTCompliance />} />

              {/* Customer Routes */}
              <Route path="/customers" element={<ProtectedRoute user={user} module={Module.Customers}><Customers /></ProtectedRoute>} />
              <Route path="/customers/addCustomer" element={<ProtectedRoute user={user} module={Module.Customers}><CustomerCreation /></ProtectedRoute>} />
              <Route path="/customers/editCustomer/:id" element={<ProtectedRoute user={user} module={Module.Customers}><EditCustomer /></ProtectedRoute>} />
              <Route path="/customers/customer/:id" element={<ProtectedRoute user={user} module={Module.Customers}><ViewCustomer /></ProtectedRoute>} />

              {/* Cost Center Routes */}
              <Route path="/cost-centers" element={<ProtectedRoute user={user} module={Module.Customers}><CostCenterList /></ProtectedRoute>} />
              <Route path="/cost-centers/add" element={<ProtectedRoute user={user} module={Module.Customers}><AddCostCenter /></ProtectedRoute>} />
              <Route path="/cost-centers/edit/:id" element={<ProtectedRoute user={user} module={Module.Customers}><EditCostCenter /></ProtectedRoute>} />

              {/* Projects */}
              <Route path="/projects" element={<ProtectedRoute user={user} module={Module.Customers}><Projects /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="/settings" element={user?.is_admin ? <Settings /> : <Forbidden />} />

              {/* User Management */}
              <Route path="/users" element={<ProtectedRoute user={user} module={Module.Users}><Users /></ProtectedRoute>} />
              <Route path="/users/editUser/:id" element={<ProtectedRoute user={user} module={Module.Users}><EditUser /></ProtectedRoute>} />
              <Route path="/users/addUser" element={<ProtectedRoute user={user} module={Module.Users}><AddUser /></ProtectedRoute>} />
            </Routes>
          }
        />
      </Suspense>
    </div>
  );
}