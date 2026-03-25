import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { deleteExpense, expenseSelector, fetchExpenseData } from "../../ReduxApi/expense";
import { fetchIncomingInvoices, deleteIncomingInvoice, incomingInvoiceSelector } from "../../ReduxApi/incomingInvoice";
import axiosInstance from "../../utils/axiosInstance";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import SalaryTab from "./SalaryTab";
import OthersTab from "./OthersTab";

// 🔑 Helper to safely extract Mongo ObjectId as string
const getExpenseId = (expense) => {
  if (!expense) return "";

  // If backend already sends `id` as a plain string
  if (typeof expense.id === "string") return expense.id;

  // Mongo style: _id as string or as { $oid: "..." }
  if (expense._id) {
    if (typeof expense._id === "string") return expense._id;
    if (
      typeof expense._id === "object" &&
      expense._id !== null &&
      typeof expense._id.$oid === "string"
    ) {
      return expense._id.$oid;
    }
  }

  return "";
};

export default function ExpenseList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState([]);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const itemsPerPage = 10;
  const { expenseData, isLoading, isError } = useSelector(expenseSelector);
  const { user } = useSelector(authSelector);
  const hasWrite = canWrite(user, Module.Expenses);
  const hasDelete = canDelete(user, Module.Expenses);

  // Use Redux data instead of local state
  const expenses = expenseData || [];
  const totalCount = expenses.length;
  const loading = isLoading;
  const error = isError ? "Error loading expenses" : null;

  // Fetch expenses and incoming invoices on mount
  useEffect(() => {
    dispatch(fetchExpenseData());
    dispatch(fetchIncomingInvoices());
  }, [dispatch]);

  // Navigate helpers
  const createExpense = () => {
    nav("/expenses/addExpense");
  };

  const onEdit = (id) => {
    nav(`/expenses/editExpense/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    try {
      // Use Redux action instead of direct axios call
      await dispatch(deleteExpense(id));
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong while deleting expense");
    }
  };

  // Calculate stats from current expenses
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.total_amount) || 0),
    0
  );

  // Get unique projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axiosInstance.get('/expenses/projects');
        if (response?.status === 200) {
          const data = response?.data;
          setProjects(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();
  }, []);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  // Format date helper
  // Format date helper - improved version
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";

    try {
      // Handle MongoDB DateTime object format
      if (typeof dateStr === 'object' && dateStr.$date) {
        return new Date(dateStr.$date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }

      // Handle ISO string or regular date string
      const date = new Date(dateStr);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateStr; // Return original string if can't parse
      }

      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "-";
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "SUBMITTED":
        return "bg-blue-100 text-blue-700";
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "REIMBURSED":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const [activeTab, setActiveTab] = useState("expenses");

  // Incoming invoices
  const { data: incomingData, isLoading: inLoading } = useSelector(incomingInvoiceSelector);
  const incomingInvoices = Array.isArray(incomingData) ? incomingData : [];
  const [inSearch, setInSearch] = useState("");
  const [inStatusFilter, setInStatusFilter] = useState("All");
  const [inPage, setInPage] = useState(1);
  const [showIncomingOptions, setShowIncomingOptions] = useState(false);
  const inItemsPerPage = 10;

  const getIncomingId = (inv) => {
    if (typeof inv.id === "string") return inv.id;
    if (inv._id) {
      if (typeof inv._id === "string") return inv._id;
      if (typeof inv._id === "object" && inv._id?.$oid) return inv._id.$oid;
    }
    return "";
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = (b) => {
    if (b.status === "Paid") return false;
    const due = b.due_date || "";
    if (!due) return false;
    return new Date(due) < today;
  };

  const filteredIncoming = incomingInvoices.filter((b) => {
    const matchSearch = (b.invoice_number || "").toLowerCase().includes(inSearch.toLowerCase()) || (b.vendor_name || "").toLowerCase().includes(inSearch.toLowerCase());
    const matchStatus = inStatusFilter === "All" || b.status === inStatusFilter;
    return matchSearch && matchStatus;
  });
  const inTotalPages = Math.ceil(filteredIncoming.length / inItemsPerPage) || 1;
  const inStart = (inPage - 1) * inItemsPerPage;
  const currentIncoming = filteredIncoming.slice(inStart, inStart + inItemsPerPage);

  const getInStatusColor = (s) => {
    if (s === "Paid") return "bg-green-100 text-green-800";
    if (s === "Overdue") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const handleDeleteIncoming = (id) => {
    if (!window.confirm("Are you sure you want to delete this incoming invoice?")) return;
    dispatch(deleteIncomingInvoice(id));
  };

  const tabs = [
    { key: "expenses", label: "Expenses" },
    { key: "incoming", label: "Incoming Invoices" },
    { key: "salary", label: "Salary" },
    { key: "projects", label: "Projects" },
    { key: "others", label: "Others" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${activeTab === t.key
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "salary" && <SalaryTab />}
      {activeTab === "others" && <OthersTab />}
      {activeTab === "projects" && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Projects</p>
          <p className="text-sm mt-1">Coming soon</p>
        </div>
      )}

      {activeTab === "incoming" && (
        <div className="max-w-7xl lg:w-full md:w-full">
          {/* Action Bar */}
          <div className="sticky top-[88px] z-100 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by bill number or vendor..."
                  className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                  value={inSearch}
                  onChange={(e) => { setInSearch(e.target.value); setInPage(1); }}
                />
              </div>
              <div className="flex items-center gap-2 pr-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={inStatusFilter}
                  onChange={(e) => { setInStatusFilter(e.target.value); setInPage(1); }}
                >
                  <option value="All">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                </select>
                {hasWrite && (
                  <div className="relative">
                    <button
                      onClick={() => setShowIncomingOptions((v) => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Create</span>
                    </button>
                    {showIncomingOptions && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button onClick={() => { setShowIncomingOptions(false); nav("/invoices/addIncomingInvoice?type=domestic"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🏠 Domestic Bill</button>
                        <button onClick={() => { setShowIncomingOptions(false); nav("/invoices/addIncomingInvoice?type=international"); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">🌍 International Bill</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Bills</p><p className="text-2xl font-bold text-gray-900">{incomingInvoices.length}</p></div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Amount</p>
              <p className="text-2xl font-bold text-green-600">
                ₹ {incomingInvoices
                  .reduce((sum, b) => sum + Number(b.total || 0), 0)
                  .toLocaleString("en-IN")}
              </p>
            </div>
            {/* <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Unpaid</p><p className="text-2xl font-bold text-yellow-600">{incomingInvoices.filter(b => b.status !== "Paid" && !isOverdue(b)).length}</p></div> */}
            {/* <div className="bg-white p-4 rounded-lg shadow-sm"><p className="text-sm text-gray-600 mb-1">Overdue</p><p className="text-2xl font-bold text-red-600">{incomingInvoices.filter(isOverdue).length}</p></div> */}
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bill No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inLoading ? (
                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                  ) : currentIncoming.length > 0 ? currentIncoming.map((bill) => {
                    const bid = getIncomingId(bill);
                    return (
                      <tr key={bid || bill.invoice_number} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 cursor-pointer" onClick={() => bid && nav(`/invoices/editIncomingInvoice/${bid}`)}>{bill.invoice_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{bill.vendor_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.invoice_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{bill.due_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{bill.currency_type} {Number(bill.total || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInStatusColor(bill.status)}`}>{bill.status || "Unpaid"}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => bid && nav(`/invoices/editIncomingInvoice/${bid}`)} disabled={!hasWrite} className={`transition-colors ${hasWrite ? "text-gray-600 hover:text-green-600" : "text-gray-300 cursor-not-allowed"}`}><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => bid && handleDeleteIncoming(bid)} disabled={!hasDelete} className={`transition-colors ${hasDelete ? "text-gray-600 hover:text-red-600" : "text-gray-300 cursor-not-allowed"}`}><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No incoming invoices found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredIncoming.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">Showing {inStart + 1} to {Math.min(inStart + inItemsPerPage, filteredIncoming.length)} of {filteredIncoming.length} results</p>
                <div className="flex gap-1">
                  {[...Array(inTotalPages)].map((_, i) => (
                    <button key={i + 1} onClick={() => setInPage(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${inPage === i + 1 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}>{i + 1}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="max-w-7xl lg:w-full md:w-full">
          {/* Action Bar */}
          <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 shadow-sm mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters + Create Expense */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Project Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                    value={projectFilter}
                    onChange={(e) => {
                      setProjectFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Projects</option>
                    {projects?.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Create Expense Button */}
                <button
                  onClick={createExpense}
                  disabled={!hasWrite}
                  className={`flex items-center mr-2 gap-2 px-4 py-2 rounded-lg transition-colors ${hasWrite
                    ? "cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                    }`}
                  title={!hasWrite ? "You don't have permission to create expenses" : ""}
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading / Error states */}
          {loading && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <p className="text-gray-600">Loading expenses...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-indigo-700">
                ₹ {totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
            {/* <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Unique Projects</p>
            <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
          </div> */}
          </div>

          {/* Expense Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Project / Cost Center
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.length > 0 ? (
                    expenses.map((expense) => {
                      const id = getExpenseId(expense);
                      const firstItem = expense.items?.[0];

                      return (
                        <tr
                          key={id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td
                            className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer"
                            onClick={() => onEdit(id)}
                          >
                            {expense.expense_title || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            {expense.project_cost_center || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                            {formatDate(firstItem?.expense_date || expense.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">
                            {firstItem?.currency || "INR"}{" "}
                            {Number(expense.total_amount || 0).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                expense.status
                              )}`}
                            >
                              {expense.status || "DRAFT"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => hasWrite && onEdit(id)}
                                disabled={!hasWrite}
                                className={`transition-colors ${hasWrite
                                  ? "cursor-pointer text-gray-600 hover:text-green-600"
                                  : "cursor-not-allowed text-gray-300"
                                  }`}
                                title={!hasWrite ? "No write permission" : "Edit"}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => hasDelete && handleDelete(id)}
                                disabled={!hasDelete}
                                className={`transition-colors ${hasDelete
                                  ? "cursor-pointer text-gray-600 hover:text-red-600"
                                  : "cursor-not-allowed text-gray-300"
                                  }`}
                                title={!hasDelete ? "No delete permission" : "Delete"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        {loading
                          ? "Loading..."
                          : "No expenses found. Try creating one."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                  {totalCount} results
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}