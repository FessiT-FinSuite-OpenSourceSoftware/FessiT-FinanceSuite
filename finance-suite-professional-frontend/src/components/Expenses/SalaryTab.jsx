import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, Search, Filter } from "lucide-react";

const DUMMY_SALARY = [
  { id: 1, employee: "Ravi Kumar",     department: "Engineering",  month: "Jun 2025", basic: 60000, hra: 24000, deductions: 7200,  net: 76800,  status: "Paid" },
  { id: 2, employee: "Priya Sharma",   department: "Design",       month: "Jun 2025", basic: 55000, hra: 22000, deductions: 6600,  net: 70400,  status: "Paid" },
  { id: 3, employee: "Arjun Mehta",    department: "Sales",        month: "Jun 2025", basic: 45000, hra: 18000, deductions: 5400,  net: 57600,  status: "Pending" },
  { id: 4, employee: "Sneha Reddy",    department: "HR",           month: "Jun 2025", basic: 50000, hra: 20000, deductions: 6000,  net: 64000,  status: "Paid" },
  { id: 5, employee: "Kiran Patel",    department: "Engineering",  month: "Jun 2025", basic: 70000, hra: 28000, deductions: 8400,  net: 89600,  status: "Pending" },
  { id: 6, employee: "Divya Nair",     department: "Finance",      month: "May 2025", basic: 52000, hra: 20800, deductions: 6240,  net: 66560,  status: "Paid" },
  { id: 7, employee: "Suresh Babu",    department: "Operations",   month: "May 2025", basic: 40000, hra: 16000, deductions: 4800,  net: 51200,  status: "Paid" },
];

const empty = () => ({ employee: "", department: "", month: "", basic: "", hra: "", deductions: "", status: "Pending" });

const statusColor = (s) => s === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";

export default function SalaryTab() {
  const [rows, setRows] = useState(DUMMY_SALARY);
  const [modal, setModal] = useState(null); // null | { mode: "create"|"edit", data, id? }
  const [form, setForm] = useState(empty());

  const openCreate = () => { setForm(empty()); setModal({ mode: "create" }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ mode: "edit", id: row.id }); };
  const closeModal = () => setModal(null);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    const net = (parseFloat(form.basic) || 0) + (parseFloat(form.hra) || 0) - (parseFloat(form.deductions) || 0);
    const payload = { ...form, basic: parseFloat(form.basic) || 0, hra: parseFloat(form.hra) || 0, deductions: parseFloat(form.deductions) || 0, net };

    if (modal.mode === "create") {
      const newRow = { ...payload, id: Date.now() };
      console.log("[Salary] CREATE payload:", newRow);
      setRows((p) => [newRow, ...p]);
    } else {
      const updated = { ...payload, id: modal.id };
      console.log("[Salary] EDIT payload:", updated);
      setRows((p) => p.map((r) => r.id === modal.id ? updated : r));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this salary record?")) return;
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const departments = ["All", ...Array.from(new Set(rows.map(r => r.department)))];

  const filtered = rows.filter((r) => {
    const matchSearch = r.employee.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || r.department === deptFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const totalNet = filtered.reduce((s, r) => s + r.net, 0);

  const inputCls = "border border-gray-300 rounded px-3 py-2 w-full text-sm";

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      {/* Action Bar */}
      <div className="sticky top-[88px] z-10 rounded-lg bg-white border border-gray-300 py-4 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by employee or department..." className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              {departments.map(d => <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>)}
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Employees</p><p className="text-2xl font-bold text-gray-900">{filtered.length}</p></div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Total Net Payout</p><p className="text-2xl font-bold text-indigo-700">₹ {totalNet.toLocaleString("en-IN")}</p></div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><p className="text-sm text-gray-600 mb-1">Pending</p><p className="text-2xl font-bold text-yellow-600">{filtered.filter(r => r.status === "Pending").length}</p></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Employee", "Department", "Month", "Basic", "HRA", "Deductions", "Net Pay", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">No records found.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.employee}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap">₹ {r.basic.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 whitespace-nowrap">₹ {r.hra.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">₹ {r.deductions.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">₹ {r.net.toLocaleString("en-IN")}</td>
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
              <h3 className="text-base font-semibold text-gray-800">{modal.mode === "create" ? "Add Salary Record" : "Edit Salary Record"}</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Employee Name", name: "employee", type: "text" },
                { label: "Department",    name: "department", type: "text" },
                { label: "Month",         name: "month", type: "text", placeholder: "e.g. Jun 2025" },
                { label: "Basic (₹)",     name: "basic", type: "number" },
                { label: "HRA (₹)",       name: "hra", type: "number" },
                { label: "Deductions (₹)",name: "deductions", type: "number" },
              ].map(({ label, name, type, placeholder }) => (
                <div key={name}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                  <input type={type} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder || ""} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Net Pay (auto)</label>
                <input readOnly value={`₹ ${((parseFloat(form.basic)||0)+(parseFloat(form.hra)||0)-(parseFloat(form.deductions)||0)).toLocaleString("en-IN")}`} className={`${inputCls} bg-gray-50 text-gray-500`} />
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
