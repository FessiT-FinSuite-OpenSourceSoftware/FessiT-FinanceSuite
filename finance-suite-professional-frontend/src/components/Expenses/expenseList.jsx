import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { deleteExpense, updateExpense, expenseSelector, fetchExpenseData } from "../../ReduxApi/expense";
import { fetchIncomingInvoices } from "../../ReduxApi/incomingInvoice";
import axiosInstance from "../../utils/axiosInstance";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import SalaryTab from "./SalaryTab";
import OthersTab from "./OthersTab";
import IncomingInvoicesTab from "./IncomingInvoicesTab";
import ProjectsTab from "./ProjectsTab";
import { TabActionBar, FilterSelect, StatCard, TableWrapper, TableHead, EmptyRow, RowActions, Pagination } from "../../shared/ui";

const getExpenseId = (expense) => {
  if (!expense) return "";
  if (typeof expense.id === "string") return expense.id;
  if (expense._id) {
    if (typeof expense._id === "string") return expense._id;
    if (typeof expense._id === "object" && expense._id !== null && typeof expense._id.$oid === "string")
      return expense._id.$oid;
  }
  return "";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    if (typeof dateStr === "object" && dateStr.$date)
      return new Date(dateStr.$date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    // Handle dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split("-");
      return new Date(+y, +m - 1, +d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
    // Handle yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return new Date(+y, +m - 1, +d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "-"; }
};

const getStatusColor = (status) => {
  switch ((status || "").toUpperCase()) {
    case "DRAFT":       return "bg-gray-100 text-gray-700";
    case "SUBMITTED":   return "bg-blue-100 text-blue-700";
    case "APPROVED":    return "bg-green-100 text-green-700";
    case "REJECTED":    return "bg-red-100 text-red-700";
    case "REIMBURSED":  return "bg-purple-100 text-purple-700";
    default:            return "bg-gray-100 text-gray-700";
  }
};

const toInputDate = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  const [d, m, y] = ddmmyyyy.split("-");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
};

const toStoredDate = (yyyymmdd) => {
  if (!yyyymmdd) return "";
  const [y, m, d] = yyyymmdd.split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
};


const TABS = [
  { key: "expenses", label: "Reimbursements" },
  { key: "incoming", label: "Invoices" },
  { key: "salary",   label: "Salary" },
  { key: "others",   label: "General" },
];

const COLUMNS = [
  { label: "Title" }, { label: "Project / Cost Center", hidden: true },
  { label: "Date", hidden: true }, { label: "Amount" },
  { label: "Status", hidden: true }, { label: "Actions", right: true },
];

export default function ExpenseList() {
  const [activeTab,     setActiveTab]     = useState("expenses");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const [projects,      setProjects]      = useState([]);
  const [statusPopup,   setStatusPopup]   = useState(null);

  const dispatch   = useDispatch();
  const nav        = useNavigate();
  const { expenseData, isLoading } = useSelector(expenseSelector);
  const { user }   = useSelector(authSelector);
  const isAdmin    = user?.is_admin === true;
  const hasWrite   = canWrite(user, Module.Expenses);
  const hasDelete  = canDelete(user, Module.Expenses);

  useEffect(() => { dispatch(fetchExpenseData()); dispatch(fetchIncomingInvoices()); }, [dispatch]);
  useEffect(() => { axiosInstance.get("/expenses/projects").then((res) => { if (res?.status === 200) setProjects(res.data || []); }).catch(() => {}); }, []);

  const handleStatusSave = () => {
    if (statusPopup.status === "REIMBURSED" && !statusPopup.reimbursedAt) {
      toast.error("Please select a reimbursement date");
      return;
    }
    const exp = (expenseData || []).find((e) => getExpenseId(e) === statusPopup.id);
    if (!exp) return;
    const formData = new FormData();
    formData.append("expenseTitle", exp.expense_title || "");
    formData.append("projectCostCenter", exp.project_cost_center || "");
    formData.append("currency", exp.items?.[0]?.currency || "INR");
    formData.append("notes", exp.notes || "");
    formData.append("status", statusPopup.status);
    if (statusPopup.status === "REIMBURSED")
      formData.append("reimbursedAt", toStoredDate(statusPopup.reimbursedAt));
    dispatch(updateExpense(statusPopup.id, formData));
    setStatusPopup(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try { await dispatch(deleteExpense(id)); }
    catch (err) { toast.error(err.message || "Something went wrong while deleting expense"); }
  };

  const expenses    = (expenseData || []).filter((exp) => !searchTerm || (exp.expense_title || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const totalCount  = expenses.length;
  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.total_amount) || 0), 0);
  const totalPages  = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginated   = expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${activeTab === t.key ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "incoming" && <IncomingInvoicesTab />}
      {activeTab === "salary"   && <SalaryTab />}
      {activeTab === "others"   && <OthersTab />}
      {activeTab === "projects" && <ProjectsTab />}

      {activeTab === "expenses" && (
        <div className="max-w-7xl lg:w-full md:w-full">
          <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by title...">
            <FilterSelect value={projectFilter} onChange={(v) => { setProjectFilter(v); setCurrentPage(1); }}>
              <option value="All">All Projects</option>
              {projects.map((proj) => <option key={proj} value={proj}>{proj}</option>)}
            </FilterSelect>
            <button
              onClick={() => nav("/expenses/addExpense")}
              disabled={!hasWrite}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
            </button>
          </TabActionBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <StatCard label="Total Records" value={totalCount} />
            <StatCard label="Total Amount" value={`₹ ${totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} valueClass="text-indigo-700" />
          </div>

          <TableWrapper>
            <TableHead columns={COLUMNS} />
            <tbody className="divide-y divide-gray-200">
              {paginated.length > 0 ? paginated.map((expense) => {
                const id = getExpenseId(expense);
                const firstItem = expense.items?.[0];
                const locked = (expense.status || "").toUpperCase() === "REIMBURSED" && !isAdmin;
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium cursor-pointer" onClick={() => nav(`/expenses/editExpense/${id}`)}>{expense.expense_title || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{expense.project_cost_center || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{formatDate(firstItem?.expense_date || expense.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{firstItem?.currency || "INR"} {Number(expense.total_amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <span
                        onClick={() => !locked && hasWrite && setStatusPopup({ id, status: expense.status || "DRAFT", reimbursedAt: toInputDate(expense.reimbursed_at) })}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)} ${!locked && hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
                      >
                        {expense.status || "DRAFT"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <RowActions
                        onEdit={() => hasWrite && nav(`/expenses/editExpense/${id}`)}
                        onDelete={() => hasDelete && handleDelete(id)}
                        canEdit={hasWrite}
                        canDelete={hasDelete}
                      />
                    </td>
                  </tr>
                );
              }) : (
                <EmptyRow colSpan={6} message={isLoading ? "Loading..." : "No expenses found. Try creating one."} />
              )}
            </tbody>
          </TableWrapper>
          <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={totalCount} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />
        </div>
      )}

      {statusPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Expense Status</h3>
            {(statusPopup.status || "").toUpperCase() === "REIMBURSED" && !isAdmin && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Only admins can modify a Reimbursed expense.</p>
            )}
            <select value={statusPopup.status} onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value, reimbursedAt: "" }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REIMBURSED">Reimbursed</option>
            </select>
            {statusPopup.status === "REIMBURSED" && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reimbursement Date *
                </label>
                <input
                  type="date"
                  value={statusPopup.reimbursedAt || ""}
                  onChange={(e) => setStatusPopup((p) => ({ ...p, reimbursedAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* {statusPopup.reimbursedAt && (
                  <p className="text-xs text-gray-500 mt-1">Stored: {formatDate(toStoredDate(statusPopup.reimbursedAt))}</p>
                )} */}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusPopup(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
