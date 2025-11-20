import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KeyUri, config } from "../../shared/key";

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
  const [expenses, setExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const nav = useNavigate();
  const itemsPerPage = 10;

  // Fetch expenses on mount or when filters change
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("limit", itemsPerPage);
        
        if (searchTerm) params.append("search", searchTerm);
        if (projectFilter !== "All") params.append("project_cost_center", projectFilter);

        const res = await fetch(
          `${KeyUri.BACKENDURI}/expenses?${params.toString()}`,
          config
        );
        
        if (!res.ok) {
          throw new Error("Failed to load expenses");
        }

        const data = await res.json();
        
        // Backend returns { expenses: [], total: number, page: number, limit: number }
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setTotalCount(data.total || 0);
      } catch (err) {
        console.error(err);
        setError(err.message || "Something went wrong while loading expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [currentPage, searchTerm, projectFilter]);

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
      const res = await fetch(`${KeyUri.BACKENDURI}/expenses/${id}`, {
        method: "DELETE",
        ...config,
      });

      if (!res.ok) {
        throw new Error("Failed to delete expense");
      }

      // Refresh the list after deletion
      setExpenses((prev) => prev.filter((exp) => getExpenseId(exp) !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while deleting expense");
    }
  };

  // Calculate stats from current expenses
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.total_amount) || 0),
    0
  );

  // Get unique projects for filter dropdown
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${KeyUri.BACKENDURI}/expenses/projects`, config);
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
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

  return (
    <div>
      <div className="max-w-7xl lg:w-full md:w-full">
        {/* Action Bar */}
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm mb-10">
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
                  {projects.map((proj) => (
                    <option key={proj} value={proj}>
                      {proj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create Expense Button */}
              <button
                onClick={createExpense}
                className="flex cursor-pointer items-center mr-2 gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Expense</span>
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
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Unique Projects</p>
            <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
          </div>
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
                              onClick={() => onEdit(id)}
                              className="cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(id)}
                              className="text-gray-600 cursor-pointer hover:text-red-600 transition-colors"
                              title="Delete"
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
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
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
    </div>
  );
}