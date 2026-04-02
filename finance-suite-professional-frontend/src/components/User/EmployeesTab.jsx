import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { TabActionBar, FilterSelect, StatCard, TableWrapper, TableHead, EmptyRow, RowActions, Modal, FormField, inputCls, Pagination } from "../../shared/ui";

const DUMMY_EMPLOYEES = [
  { id: 1, name: "Arjun Sharma",    emp_id: "EMP001", department: "Engineering",  designation: "Senior Developer",   email: "arjun.sharma@company.com",   phone: "+91 98765 43210", join_date: "2021-03-15", salary: 95000,  status: "Active" },
  { id: 2, name: "Priya Nair",      emp_id: "EMP002", department: "Finance",       designation: "Finance Analyst",     email: "priya.nair@company.com",     phone: "+91 87654 32109", join_date: "2020-07-01", salary: 72000,  status: "Active" },
  { id: 3, name: "Rahul Verma",     emp_id: "EMP003", department: "HR",            designation: "HR Manager",          email: "rahul.verma@company.com",    phone: "+91 76543 21098", join_date: "2019-11-20", salary: 85000,  status: "Active" },
  { id: 4, name: "Sneha Patel",     emp_id: "EMP004", department: "Marketing",     designation: "Marketing Lead",      email: "sneha.patel@company.com",    phone: "+91 65432 10987", join_date: "2022-01-10", salary: 68000,  status: "Active" },
  { id: 5, name: "Kiran Reddy",     emp_id: "EMP005", department: "Engineering",  designation: "DevOps Engineer",     email: "kiran.reddy@company.com",    phone: "+91 54321 09876", join_date: "2021-08-05", salary: 88000,  status: "Inactive" },
  { id: 6, name: "Meera Iyer",      emp_id: "EMP006", department: "Finance",       designation: "Accountant",          email: "meera.iyer@company.com",     phone: "+91 43210 98765", join_date: "2020-04-18", salary: 62000,  status: "Active" },
  { id: 7, name: "Vikram Singh",    emp_id: "EMP007", department: "Sales",         designation: "Sales Manager",       email: "vikram.singh@company.com",   phone: "+91 32109 87654", join_date: "2018-09-30", salary: 91000,  status: "Active" },
  { id: 8, name: "Ananya Das",      emp_id: "EMP008", department: "Engineering",  designation: "QA Engineer",         email: "ananya.das@company.com",     phone: "+91 21098 76543", join_date: "2023-02-14", salary: 71000,  status: "Active" },
  { id: 9, name: "Rohan Mehta",     emp_id: "EMP009", department: "Operations",   designation: "Operations Head",     email: "rohan.mehta@company.com",    phone: "+91 10987 65432", join_date: "2017-06-22", salary: 105000, status: "Active" },
  { id: 10, name: "Divya Krishnan", emp_id: "EMP010", department: "HR",            designation: "Recruiter",           email: "divya.krishnan@company.com", phone: "+91 09876 54321", join_date: "2022-11-03", salary: 58000,  status: "Inactive" },
];

const DEPARTMENTS = ["All", "Engineering", "Finance", "HR", "Marketing", "Sales", "Operations"];

const deptColor = (dept) => {
  const map = { Engineering: "bg-blue-100 text-blue-700", Finance: "bg-green-100 text-green-700", HR: "bg-purple-100 text-purple-700", Marketing: "bg-orange-100 text-orange-700", Sales: "bg-yellow-100 text-yellow-700", Operations: "bg-teal-100 text-teal-700" };
  return map[dept] || "bg-gray-100 text-gray-700";
};

const statusColor = (s) => s === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";

const EMPTY_FORM = { name: "", emp_id: "", department: "Engineering", designation: "", email: "", phone: "", join_date: "", salary: "", status: "Active" };

export default function EmployeesTab() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,     setPageSize]    = useState(10);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [employees, setEmployees] = useState(DUMMY_EMPLOYEES);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !search || e.name.toLowerCase().includes(q) || e.emp_id.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || e.department === deptFilter;
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: "create" }); };
  const openEdit = (emp) => { setForm({ ...emp }); setModal({ mode: "edit", id: emp.id }); };
  const handleDelete = (id) => setEmployees((prev) => prev.filter((e) => e.id !== id));

  const handleSave = () => {
    if (modal.mode === "create") {
      setEmployees((prev) => [...prev, { ...form, id: Date.now(), salary: Number(form.salary) }]);
    } else {
      setEmployees((prev) => prev.map((e) => e.id === modal.id ? { ...form, id: modal.id, salary: Number(form.salary) } : e));
    }
    setModal(null);
  };

  const stats = [
    { label: "Total Employees", value: employees.length, color: "text-gray-900" },
    { label: "Active", value: employees.filter((e) => e.status === "Active").length, color: "text-green-600" },
    { label: "Inactive", value: employees.filter((e) => e.status === "Inactive").length, color: "text-red-600" },
    { label: "Departments", value: new Set(employees.map((e) => e.department)).size, color: "text-blue-600" },
  ];

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Search by name, ID, or designation...">
        <FilterSelect value={deptFilter} onChange={(v) => { setDeptFilter(v); setCurrentPage(1); }}>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </FilterSelect>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Employee</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} valueClass={s.color} />)}
      </div>

      <TableWrapper>
        <TableHead columns={[
          { label: "Employee" }, { label: "Department" }, { label: "Designation" },
          { label: "Email" }, { label: "Join Date" }, { label: "Salary (₹)" },
          { label: "Status" }, { label: "Actions", right: true },
        ]} />
        <tbody className="divide-y divide-gray-200">
          {paginated.length > 0 ? paginated.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="font-medium text-gray-900">{emp.name}</p>
                <p className="text-xs text-gray-500">{emp.emp_id}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${deptColor(emp.department)}`}>{emp.department}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{emp.designation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(emp.join_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{Number(emp.salary).toLocaleString("en-IN")}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(emp.status)}`}>{emp.status}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <RowActions onEdit={() => openEdit(emp)} onDelete={() => handleDelete(emp.id)} />
              </td>
            </tr>
          )) : (
            <EmptyRow colSpan={8} message="No employees found." />
          )}
        </tbody>
      </TableWrapper>
      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {modal && (
        <Modal title={modal.mode === "create" ? "Add Employee" : "Edit Employee"} onClose={() => setModal(null)} onSave={handleSave} saveLabel={modal.mode === "create" ? "Add Employee" : "Save Changes"}>
          {[
            { label: "Full Name",   key: "name",       type: "text" },
            { label: "Employee ID", key: "emp_id",     type: "text" },
            { label: "Designation", key: "designation",type: "text" },
            { label: "Email",       key: "email",      type: "email" },
            { label: "Phone",       key: "phone",      type: "text" },
            { label: "Join Date",   key: "join_date",  type: "date" },
            { label: "Salary (₹)", key: "salary",     type: "number" },
          ].map(({ label, key, type }) => (
            <FormField key={key} label={label}>
              <input type={type} className={inputCls} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </FormField>
          ))}
          <FormField label="Department">
            <select className={inputCls} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
              {DEPARTMENTS.filter((d) => d !== "All").map((d) => <option key={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Active</option><option>Inactive</option>
            </select>
          </FormField>
        </Modal>
      )}
    </div>
  );
}
