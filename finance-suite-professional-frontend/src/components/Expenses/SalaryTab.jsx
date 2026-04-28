import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { fetchSalaries, createSalary, updateSalary, deleteSalary, salarySelector } from "../../ReduxApi/salary";
import { authSelector } from "../../ReduxApi/auth";
import { StatCard, TabActionBar, FilterSelect, CreateButton, TableWrapper, TableHead, EmptyRow, StatusBadge, RowActions, Modal, FormField, inputCls } from "../../shared/ui";

const currentPeriod = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };

const EMPTY = { emp_name: "", emp_id: "", department: "", period: currentPeriod(), gross_salary: "", tds: "", reimbursement: "", status: "YetToBePaid", paid_on: "", cost_type: "indirect" };

const statusColor = (s) => {
  switch (s) {
    case "Paid":       return "bg-green-100 text-green-800";
    case "YetToBePaid": return "bg-yellow-100 text-yellow-800";
    case "OnHold":     return "bg-red-100 text-red-800";
    case "Settlement": return "bg-blue-100 text-blue-800";
    default:           return "bg-gray-100 text-gray-800";
  }
};

const getId = (row) => row?._id?.$oid || row?.id || "";

const fmt = (val) => Number(val || 0).toLocaleString("en-IN");

const COLUMNS = [
  { label: "Emp ID" },{ label: "Employee" },
  { label: "Period" },
   { label: "Net Salary (₹)" }, { label: "Status" }, { label: "Paid On" }, { label: "Actions", right: true },
];

export default function SalaryTab() {
  const dispatch = useDispatch();
  const { salaryData, isLoading } = useSelector(salarySelector);
  const { user } = useSelector(authSelector);
  const isAdmin = user?.is_admin === true;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusPopup, setStatusPopup] = useState(null); // { id, status, paid_on }
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { dispatch(fetchSalaries()); }, [dispatch]);

  const openCreate = () => { setForm({ ...EMPTY, period: currentPeriod() }); setModal({ mode: "create" }); };
  const openEdit = (row) => { setForm({ ...row, cost_type: row.cost_type || "indirect" }); setModal({ mode: "edit", id: getId(row) }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    const net = (parseFloat(form.gross_salary) || 0) + (parseFloat(form.reimbursement) || 0) - (parseFloat(form.tds) || 0);
    const payload = { ...form, net_salary: String(net) };
    if (modal.mode === "create") dispatch(createSalary(payload));
    else dispatch(updateSalary(modal.id, payload));
    closeModal();
  };

  const handleStatusSave = () => {
    const row = (salaryData || []).find((r) => getId(r) === statusPopup.id);
    if (!row) return;
    const net = (parseFloat(row.gross_salary) || 0) + (parseFloat(row.reimbursement) || 0) - (parseFloat(row.tds) || 0);
    dispatch(updateSalary(statusPopup.id, { ...row, status: statusPopup.status, paid_on: statusPopup.paid_on, net_salary: String(net) }));
    setStatusPopup(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this salary record?")) return;
    dispatch(deleteSalary(id));
  };

  const departments = ["All", ...Array.from(new Set((salaryData || []).map((r) => r.department).filter(Boolean)))];

  const filtered = (salaryData || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.emp_name?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q) || r.emp_id?.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || r.department === deptFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  useEffect(() => { setCurrentPage(1); }, [search, deptFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const totalNet = filtered.reduce((s, r) => s + (parseFloat(r.net_salary) || 0), 0);
  const totalTds = filtered.reduce((s, r) => s + (parseFloat(r.tds) || 0), 0);
  const netAuto = (parseFloat(form.gross_salary) || 0) + (parseFloat(form.reimbursement) || 0) - (parseFloat(form.tds) || 0);

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by employee, ID or department...">
        <FilterSelect value={deptFilter} onChange={setDeptFilter}>
          {departments.map((d) => <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>)}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="All">All Status</option>
          <option value="YetToBePaid">Yet To Be Paid</option>
          <option value="Paid">Paid</option>
          <option value="OnHold">On Hold</option>
          <option value="Settlement">Settlement</option>
        </FilterSelect>
        <CreateButton onClick={openCreate} label="Create" icon={Plus} />
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Net Payout" value={`₹ ${totalNet.toLocaleString("en-IN")}`} valueClass="text-indigo-700" />
        {/* <StatCard label="Total TDS" value={`₹ ${totalTds.toLocaleString("en-IN")}`} valueClass="text-red-600" /> */}
        <StatCard label="Yet To Be Paid" value={filtered.filter((r) => r.status === "YetToBePaid").length} valueClass="text-yellow-600" />
      </div>

      <TableWrapper>
        <TableHead columns={COLUMNS} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={10} message="Loading..." />
          ) : paginated.length === 0 ? (
            <EmptyRow colSpan={10} />
          ) : paginated.map((r) => (
            <tr key={getId(r)} className="hover:bg-gray-50 transition-colors">
               <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.emp_id}</td>
              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.emp_name}</td>
             
              {/* <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.period ? new Date(r.period + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "-"}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-gray-600">₹ {fmt(r.gross_salary)}</td> */}
              {/* <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">₹ {fmt(r.tds)}</td> */}
              {/* <td className="px-6 py-4 whitespace-nowrap text-gray-600">₹ {fmt(r.reimbursement)}</td> */}
              <td className="px-6 py-4 whitespace-nowrap font-semibold">₹ {fmt(r.net_salary)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {(() => { const locked = r.status === "Paid" && !isAdmin; return (
                  <span onClick={() => !locked && setStatusPopup({ id: getId(r), status: r.status, paid_on: r.paid_on || "" })} className={`px-2 py-1 rounded-full text-xs font-medium transition-opacity ${statusColor(r.status)} ${!locked ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}>
                    <StatusBadge status={r.status} colorFn={statusColor} />
                  </span>
                ); })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">{r.paid_on || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right"><RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(getId(r))} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>

      {filtered.length > 0 && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center mt-0 rounded-b-lg">
          <p className="text-sm text-gray-600">Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} results</p>
          <select onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="bg-gray-200 text-sm px-2 py-2 rounded-sm">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Add Salary Entry" : "Edit Salary Record"} onClose={closeModal} onSave={handleSave}>
          {[
            { label: "Employee Name",      name: "emp_name",      type: "text" },
            { label: "Employee ID",        name: "emp_id",        type: "text" },
            { label: "Department",         name: "department",    type: "text" },
            { label: "Gross Salary (₹)",   name: "gross_salary",  type: "number" },
            { label: "TDS (₹)",            name: "tds",           type: "number" },
            { label: "Reimbursement (₹)",  name: "reimbursement", type: "number" },
          ].map(({ label, name, type }) => (
            <FormField key={name} label={label}>
              <input type={type} name={name} value={form[name]} onChange={handleChange} className={inputCls} />
            </FormField>
          ))}
          <FormField label="Period">
            <input type="month" name="period" value={form.period} onChange={handleChange} className={inputCls} />
          </FormField>
          <FormField label="Cost Type">
            <select name="cost_type" value={form.cost_type || "indirect"} onChange={handleChange} className={inputCls}>
              <option value="indirect">Indirect</option>
              <option value="direct">Direct</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              <option value="YetToBePaid">Yet To Be Paid</option>
              <option value="Paid">Paid</option>
              <option value="OnHold">On Hold</option>
              <option value="Settlement">Settlement</option>
            </select>
          </FormField>
          {form.status === "Paid" && (
            <FormField label="Paid On">
              <input type="date" name="paid_on" value={form.paid_on} onChange={handleChange} className={inputCls} />
            </FormField>
          )}
          <FormField label="Net Salary (Gross + Reimbursement − TDS)">
            <input readOnly value={`₹ ${netAuto.toLocaleString("en-IN")}`} className={`${inputCls} bg-gray-50 text-indigo-700 font-semibold`} />
          </FormField>
        </Modal>
      )}
      {statusPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Salary Status</h3>
            <select
              value={statusPopup.status}
              onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value, paid_on: e.target.value !== "Paid" ? "" : p.paid_on }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="YetToBePaid">Yet To Be Paid</option>
              <option value="Paid">Paid</option>
              <option value="OnHold">On Hold</option>
              <option value="Settlement">Settlement</option>
            </select>
            {statusPopup.status === "Paid" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">Paid On</label>
                <input
                  type="date"
                  value={statusPopup.paid_on}
                  onChange={(e) => setStatusPopup((p) => ({ ...p, paid_on: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
