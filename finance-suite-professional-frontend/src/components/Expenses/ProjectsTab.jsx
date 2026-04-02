import React, { useState } from "react";
import { Plus } from "lucide-react";
import { StatCard, TabActionBar, FilterSelect, CreateButton, TableWrapper, TableHead, EmptyRow, StatusBadge, RowActions, Modal, FormField, inputCls } from "../../shared/ui";

const DUMMY_PROJECTS = [
  { id: 1, name: "ERP Migration",       manager: "Ravi Kumar",   budget: 500000, spent: 320000, deadline: "2025-08-31", status: "Active" },
  { id: 2, name: "Mobile App v2",        manager: "Priya Sharma", budget: 300000, spent: 295000, deadline: "2025-07-15", status: "At Risk" },
  { id: 3, name: "Data Warehouse Setup", manager: "Arjun Mehta",  budget: 750000, spent: 120000, deadline: "2025-12-01", status: "Active" },
  { id: 4, name: "HR Portal Revamp",     manager: "Sneha Reddy",  budget: 200000, spent: 200000, deadline: "2025-06-30", status: "Completed" },
  { id: 5, name: "Cloud Infrastructure", manager: "Kiran Patel",  budget: 900000, spent: 450000, deadline: "2025-10-15", status: "Active" },
  { id: 6, name: "Customer Analytics",   manager: "Divya Nair",   budget: 150000, spent: 30000,  deadline: "2025-09-01", status: "On Hold" },
  { id: 7, name: "Security Audit 2025",  manager: "Suresh Babu",  budget: 80000,  spent: 80000,  deadline: "2025-06-01", status: "Completed" },
];

const STATUSES = ["Active", "Completed", "At Risk", "On Hold"];
const empty = () => ({ name: "", manager: "", budget: "", spent: "", deadline: "", status: "Active" });
const statusColor = (s) => {
  if (s === "Completed") return "bg-green-100 text-green-800";
  if (s === "At Risk")   return "bg-red-100 text-red-800";
  if (s === "On Hold")   return "bg-gray-100 text-gray-700";
  return "bg-blue-100 text-blue-800";
};
const COLUMNS = [
  { label: "Project Name" }, { label: "Manager" }, { label: "Budget" },
  { label: "Spent" }, { label: "Remaining" }, { label: "Deadline" },
  { label: "Status" }, { label: "Actions" },
];

export default function ProjectsTab() {
  const [rows, setRows] = useState(DUMMY_PROJECTS);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const openCreate = () => { setForm(empty()); setModal({ mode: "create" }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ mode: "edit", id: row.id }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    const payload = { ...form, budget: parseFloat(form.budget) || 0, spent: parseFloat(form.spent) || 0 };
    if (modal.mode === "create") {
      const newRow = { ...payload, id: Date.now() };
      console.log("[Projects] CREATE payload:", newRow);
      setRows((p) => [newRow, ...p]);
    } else {
      const updated = { ...payload, id: modal.id };
      console.log("[Projects] EDIT payload:", updated);
      setRows((p) => p.map((r) => r.id === modal.id ? updated : r));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this project?")) return;
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const filtered = rows.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.manager.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalBudget = filtered.reduce((s, r) => s + r.budget, 0);
  const totalSpent  = filtered.reduce((s, r) => s + r.spent, 0);
  const remainingAuto = (parseFloat(form.budget) || 0) - (parseFloat(form.spent) || 0);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by project or manager...">
        <FilterSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="All">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
        <CreateButton onClick={openCreate} label="Create" icon={Plus} />
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Projects" value={filtered.length} />
        <StatCard label="Total Budget"   value={`₹ ${totalBudget.toLocaleString("en-IN")}`} valueClass="text-indigo-700" />
        <StatCard label="Total Spent"    value={`₹ ${totalSpent.toLocaleString("en-IN")}`}  valueClass="text-blue-600" />
        <StatCard label="At Risk"        value={filtered.filter((r) => r.status === "At Risk").length} valueClass="text-red-600" />
      </div>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {filtered.length === 0 ? <EmptyRow colSpan={8} /> : filtered.map((r) => {
            const remaining = r.budget - r.spent;
            const pct = r.budget > 0 ? Math.min(100, Math.round((r.spent / r.budget) * 100)) : 0;
            return (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.manager}</td>
                <td className="px-6 py-4 whitespace-nowrap">₹ {r.budget.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>₹ {r.spent.toLocaleString("en-IN")}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>₹ {remaining.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.deadline}</td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={r.status} colorFn={statusColor} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-right"><RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r.id)} /></td>
              </tr>
            );
          })}
        </tbody>
      </TableWrapper>

      {modal && (
        <Modal title={modal.mode === "create" ? "Add Project" : "Edit Project"} onClose={closeModal} onSave={handleSave}>
          <FormField label="Project Name" colSpan>
            <input type="text" name="name" value={form.name} onChange={handleChange} className={inputCls} />
          </FormField>
          {[
            { label: "Manager",    name: "manager",  type: "text" },
            { label: "Deadline",   name: "deadline", type: "date" },
            { label: "Budget (₹)", name: "budget",   type: "number" },
            { label: "Spent (₹)",  name: "spent",    type: "number" },
          ].map(({ label, name, type }) => (
            <FormField key={name} label={label}>
              <input type={type} name={name} value={form[name]} onChange={handleChange} className={inputCls} />
            </FormField>
          ))}
          <FormField label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Remaining (auto)">
            <input readOnly value={`₹ ${remainingAuto.toLocaleString("en-IN")}`} className={`${inputCls} bg-gray-50 text-gray-500`} />
          </FormField>
        </Modal>
      )}
    </div>
  );
}
