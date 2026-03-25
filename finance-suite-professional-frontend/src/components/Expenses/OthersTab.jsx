import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, Search, Filter } from "lucide-react";

const DUMMY_OTHERS = [
  { id: 1, title: "Office Supplies",       category: "Supplies",    date: "2025-06-01", amount: 4500,  paid_by: "Ravi Kumar",   status: "Approved" },
  { id: 2, title: "Team Lunch",            category: "Meals",       date: "2025-06-05", amount: 3200,  paid_by: "Priya Sharma", status: "Approved" },
  { id: 3, title: "Software License",      category: "Software",    date: "2025-06-08", amount: 12000, paid_by: "Arjun Mehta",  status: "Pending" },
  { id: 4, title: "Client Travel - Delhi", category: "Travel",      date: "2025-06-10", amount: 8750,  paid_by: "Sneha Reddy",  status: "Approved" },
  { id: 5, title: "Printer Cartridges",    category: "Supplies",    date: "2025-06-12", amount: 1800,  paid_by: "Kiran Patel",  status: "Pending" },
  { id: 6, title: "Conference Fee",        category: "Other",       date: "2025-05-20", amount: 5000,  paid_by: "Divya Nair",   status: "Approved" },
  { id: 7, title: "Internet Bill",         category: "Utilities",   date: "2025-05-31", amount: 2999,  paid_by: "Suresh Babu",  status: "Approved" },
];

const CATEGORIES = ["Supplies", "Meals", "Software", "Travel", "Utilities", "Other"];

const empty = () => ({ title: "", category: "Supplies", date: "", amount: "", paid_by: "", status: "Pending" });

const statusColor = (s) => {
  if (s === "Approved") return "bg-green-100 text-green-800";
  if (s === "Rejected") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
};

export default function OthersTab() {
  const [rows, setRows] = useState(DUMMY_OTHERS);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty());

  const openCreate = () => { setForm(empty()); setModal({ mode: "create" }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ mode: "edit", id: row.id }); };
  const closeModal = () => setModal(null);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    const payload = { ...form, amount: parseFloat(form.amount) || 0 };
    if (modal.mode === "create") {
      const newRow = { ...payload, id: Date.now() };
      console.log("[Others] CREATE payload:", newRow);
      setRows((p) => [newRow, ...p]);
    } else {
      const updated = { ...payload, id: modal.id };
      console.log("[Others] EDIT payload:", updated);
      setRows((p) => p.map((r) => r.id === modal.id ? updated : r));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this record?")) return;
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = rows.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.paid_by.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || r.category === categoryFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm";

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      {/* Action Bar */}
      <div className="sticky top-[88px] z-10 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by title or paid by..." className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Records</p><p className="text-2xl font-bold text-gray-900">{filtered.length}</p></div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Amount</p><p className="text-2xl font-bold text-indigo-700">₹ {totalAmount.toLocaleString("en-IN")}</p></div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Pending</p><p className="text-2xl font-bold text-yellow-600">{filtered.filter(r => r.status === "Pending").length}</p></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Title", "Category", "Date", "Amount", "Paid By", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No records found.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">₹ {r.amount.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.paid_by}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="text-gray-600 hover:text-green-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-600 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">{modal.mode === "create" ? "Add Other Expense" : "Edit Other Expense"}</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" name="amount" value={form.amount} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Paid By</label>
                <input type="text" name="paid_by" value={form.paid_by} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
