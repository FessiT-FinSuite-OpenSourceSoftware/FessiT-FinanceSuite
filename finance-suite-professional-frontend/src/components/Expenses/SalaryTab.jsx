import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search, ReceiptText } from "lucide-react";
import { fetchSalaries, createSalary, updateSalary, deleteSalary, salarySelector } from "../../ReduxApi/salary";
import { fetchEmployees, employeeSelector } from "../../ReduxApi/employee";
import { authSelector } from "../../ReduxApi/auth";
import { orgamisationSelector, fetchOrganisationByEmail } from "../../ReduxApi/organisation";
import { StatCard, TabActionBar, FilterSelect, CreateButton, DataTable, StatusBadge, RowActions, Modal, FormField, inputCls, Pagination, ConfirmModal, TdsSectionSelect, ComboField, InfoCard, FilterChips } from "../../shared/ui";
import MonthRangeSelector from "../../shared/MonthRangeSelector";
import { TDS_FLAT_LIST } from "../../utils/tdsData";

const currentPeriod = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; };
const EMPTY = { emp_name: "", emp_id: "", employeeId: "", department: "", period: currentPeriod(), gross_salary: "", tds: "", reimbursement: "", status: "YetToBePaid", paid_on: "", cost_type: "indirect", tds_section_key: "", tds_section_new: "", tds_section_old: "", tds_section_nature: "", _manual: false, _tdsManual: false };

const statusColor = (s) => {
  switch (s) {
    case "Paid": return "bg-green-100 text-green-800";
    case "YetToBePaid": return "bg-yellow-100 text-yellow-800";
    case "OnHold": return "bg-red-100 text-red-800";
    case "Settlement": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
};
const statusLabel = (s) => {
  switch (s) {
    case "YetToBePaid": return "Yet To Be Paid";
    case "OnHold": return "On Hold";
    default: return s;
  }
};

const getId = (row) => row?._id?.$oid || row?.id || "";

function EmployeeSearchSelect({ employees, empLoading, value, onSelect, manual, onToggleManual }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (!manual) setQuery(value || ""); }, [value, manual]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = (employees || []).filter((e) => {
    const name = `${e.first_name || ""} ${e.last_name || ""}`.trim().toLowerCase();
    const empId = (e.emp_id || "").toLowerCase();
    const dept = (e.department || "").toLowerCase();
    const q = query.toLowerCase();
    return !query || name.includes(q) || empId.includes(q) || dept.includes(q);
  });

  if (manual) {
    return (
      <div className="space-y-1">
        <input
          autoFocus
          type="text"
          name="emp_name"
          placeholder="Enter employee name"
          className="border border-gray-300 rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          onChange={(e) => onSelect({ _manualName: e.target.value, emp_id: "", department: "" })}
        />
        <button type="button" onClick={() => onToggleManual(false)}
          className="text-xs text-blue-600 hover:underline">
          ← Search from employees
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="border border-gray-300 rounded px-3 py-2 pl-8 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={empLoading ? "Loading employees..." : "Search by name, ID or department..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">{empLoading ? "Loading..." : "No employees found"}</div>
          ) : filtered.map((emp) => {
            const id = emp._id?.$oid || emp.id || emp._id;
            const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
            return (
              <div key={id}
                onMouseDown={() => { onSelect(emp); setQuery(name); setOpen(false); }}
                className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{name}</p>
                  <p className="text-xs text-gray-400">{emp.emp_id}{emp.department ? ` · ${emp.department}` : ""}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${emp.employee_type === "permanent" ? "bg-indigo-100 text-indigo-700" :
                  emp.employee_type === "contract" ? "bg-orange-100 text-orange-700" :
                    "bg-purple-100 text-purple-700"}`}>
                  {emp.employee_type || ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {/* <button type="button" onClick={() => onToggleManual(true)}
        className="mt-1 text-xs text-blue-600 hover:underline">
        + Enter manually
      </button> */}
    </div>
  );
}
const fmt = (val) => Number(val || 0).toLocaleString("en-IN");
const getTdsSection = (row) => TDS_FLAT_LIST.find((section) => section.code === row?.tds_section_key);
const hasTdsValue = (row) => row?.tds !== undefined && row?.tds !== null && row?.tds !== "";
const calcSectionTdsAmount = (row) => {
  const section = getTdsSection(row);
  if (!section) return 0;
  const gross = parseFloat(row?.gross_salary) || 0;
  return (gross * (parseFloat(section.rateNum) || 0)) / 100;
};
const calcTdsAmount = (row) => hasTdsValue(row) ? parseFloat(row?.tds) || 0 : calcSectionTdsAmount(row);
const calcSalaryTotal = (row) => {
  const gross = parseFloat(row?.gross_salary) || 0;
  const reimb = parseFloat(row?.reimbursement) || 0;
  const tds = calcTdsAmount(row);
  const pt = parseFloat(row?.professional_tax) || 0;
  return gross + reimb - tds - pt;
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "-"; }
};

export default function SalaryTab() {
  const dispatch = useDispatch();
  const { salaryData, isLoading } = useSelector(salarySelector);
  const { user } = useSelector(authSelector);
  const isAdmin = user?.is_admin === true;
  const { currentOrganisation } = useSelector(orgamisationSelector);
  const professionalTax = parseFloat(currentOrganisation?.professionalTaxAmount ?? currentOrganisation?.professional_tax_amount ?? 0) || 0;

  const [modal, setModal] = useState(null);
  const [payslipModal, setPayslipModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { data: employees, isLoading: empLoading } = useSelector(employeeSelector);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [periodRange, setPeriodRange] = useState({ from: "", to: "" });
  const [statusPopup, setStatusPopup] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  useEffect(() => {
    if (dateFilter === "custom" || dateFilter === "all") return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toYM = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    let from = new Date(now.getFullYear(), now.getMonth(), 1);
    let to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (dateFilter === "last_month") { from = new Date(now.getFullYear(), now.getMonth() - 1, 1); to = new Date(now.getFullYear(), now.getMonth(), 0); }
    else if (dateFilter === "last_3_months") { from = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
    else if (dateFilter === "last_6_months") { from = new Date(now.getFullYear(), now.getMonth() - 5, 1); }
    setPeriodRange({ from: toYM(from), to: toYM(to) });
  }, [dateFilter]);

  useEffect(() => {
    dispatch(fetchSalaries());
  }, [dispatch]);

  useEffect(() => {
    if (!currentOrganisation) {
      const email = localStorage.getItem("email");
      if (email) dispatch(fetchOrganisationByEmail(email));
    }
  }, [currentOrganisation, dispatch]);
  useEffect(() => { setCurrentPage(1); }, [search, deptFilter, statusFilter, periodRange]);
  useEffect(() => {
    if (!statusPopup) return;
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, [statusPopup]);

  const openCreate = () => {
    setForm({ ...EMPTY, period: currentPeriod() });
    dispatch(fetchEmployees({ page: 1, pageSize: 200 }));
    setModal({ mode: "create" });
  };
  const openEdit = (row) => { setForm({ ...row, tds: hasTdsValue(row) ? row.tds : String(calcSectionTdsAmount(row)), cost_type: row.cost_type || "indirect", tds_section_key: row.tds_section_key || "", tds_section_new: row.tds_section_new || "", tds_section_old: row.tds_section_old || "", tds_section_nature: row.tds_section_nature || "", _tdsManual: hasTdsValue(row) }); setModal({ mode: "edit", id: getId(row) }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "tds") return { ...next, _tdsManual: true };
      if (name === "gross_salary" && p.tds_section_key && !p._tdsManual) {
        next.tds = String(calcSectionTdsAmount(next).toFixed(2));
      }
      return next;
    });
  };

  const handleSave = () => {
    const formWithTds = { ...form, tds: String(calcTdsAmount(form)) };
    const total = calcSalaryTotal(formWithTds);
    const { _selectedEmpId, _tdsManual, _manual, ...rest } = formWithTds;
    const payload = { ...rest, net_salary: String(total) };
    if (modal.mode === "create") dispatch(createSalary(payload));
    else dispatch(updateSalary(modal.id, payload));
    closeModal();
  };

  const handleStatusSave = () => {
    const row = (salaryData || []).find((r) => getId(r) === statusPopup.id);
    if (!row) return;
    const tds = calcTdsAmount(row);
    const rowWithTds = { ...row, tds: String(tds) };
    const total = calcSalaryTotal(rowWithTds);
    dispatch(updateSalary(statusPopup.id, { ...rowWithTds, status: statusPopup.status, paid_on: statusPopup.paid_on, net_salary: String(total) }));
    setStatusPopup(null);
  };

  const handleDelete = () => {
    if (!deleteModal?.id) return;
    dispatch(deleteSalary(deleteModal.id));
    setDeleteModal(null);
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtYM = (ym) => { if (!ym) return ""; const [y, m] = ym.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
  const dateFilterLabel = { this_month: "Current Month", last_month: "Previous Month", last_3_months: "Last 3 Months", last_6_months: "Last 6 Months" };
  const chips = [
    deptFilter !== "All" && { key: "dept", label: `Dept: ${deptFilter}` },
    statusFilter !== "All" && { key: "status", label: `Status: ${statusLabel(statusFilter)}` },
    dateFilter !== "all" && { key: "date", label: dateFilter === "custom" && periodRange.from && periodRange.to ? `${fmtYM(periodRange.from)} → ${fmtYM(periodRange.to)}` : dateFilterLabel[dateFilter] },
  ].filter(Boolean);
  const removeChip = (key) => {
    if (key === "dept") setDeptFilter("All");
    if (key === "status") setStatusFilter("All");
    if (key === "date") { setDateFilter("all"); setPeriodRange({ from: "", to: "" }); }
    setCurrentPage(1);
  };

  const departments = ["All", ...Array.from(new Set((salaryData || []).map((r) => r.department).filter(Boolean)))];

  const filtered = (salaryData || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.emp_name?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q) || r.emp_id?.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || r.department === deptFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    const matchPeriod = (!periodRange.from && !periodRange.to) ||
      (r.period &&
        (!periodRange.from || r.period >= periodRange.from) &&
        (!periodRange.to || r.period <= periodRange.to));
    return matchSearch && matchDept && matchStatus && matchPeriod;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalNet = filtered.reduce((s, r) => s + calcSalaryTotal(r), 0);
  const totalTds = filtered.reduce((s, r) => s + calcTdsAmount(r), 0);
  const totalGross = filtered.reduce((s, r) => s + (parseFloat(r.gross_salary) || 0), 0);
  const totalrememb = filtered.reduce((s, r) => s + (parseFloat(r.reimbursement) || 0), 0);

  const tdsAmount = calcTdsAmount(form);
  const netAuto = (parseFloat(form.gross_salary) || 0) + (parseFloat(form.reimbursement) || 0) - tdsAmount - professionalTax;

  const columns = [
    { label: "Emp ID", center: true, render: (r) => <span className="text-gray-600">{r.emp_id}</span> },
    { label: "Employee", center: true, render: (r) => <span className="font-medium text-gray-900">{r.emp_name}</span> },
    { label: "Period", center: true, render: (r) => <span className="text-gray-600">{r.period ? new Date(r.period + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "-"}</span> },
    { label: "Total Amount (INR)", center: true, render: (r) => <span className="font-semibold">INR {fmt(calcSalaryTotal(r))}</span> },
    {
      label: "Status", center: true, stopPropagation: true,
      render: (r) => {
        const locked = r.status === "Paid" && !isAdmin;
        return (
          <span
            onClick={() =>
              !locked &&
              setStatusPopup({
                id: getId(r),
                status: r.status,
                paid_on: r.paid_on || "",
              })
            }
            className={`inline-flex w-[110px] justify-center px-2 py-1 rounded-full text-xs font-medium transition-opacity ${statusColor(r.status)} ${!locked ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
          >
            {statusLabel(r.status)}
          </span>
        );
      },
    },
    { label: "Paid On", center: true, render: (r) => <span className="text-gray-600">{r.paid_on ? formatDate(r.paid_on) : "-"}</span> },
    {
      label: "Actions", right: true, stopPropagation: true,
      render: (r) =>
        <div className="flex items-center justify-end gap-2">

          <button
            onClick={() => setPayslipModal(r)}
            className={` ${payslipModal === r ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400"} : "text-gray-300 dark:text-slate-600 cursor-not-allowed"}`}
            title="View Payslip"
          >
            <ReceiptText className="w-4 h-4" />
          </button>

          <RowActions
            onEdit={() => openEdit(r)}
            onDelete={() =>
              setDeleteModal({
                id: getId(r),
                name: r.emp_name || "this salary record",
              })
            }
          />
        </div>,
    },
  ];

const formatCompactINR = (value) => {
  const num = Number(value || 0);

  if (num < 100000) {
    return `₹ ${num.toLocaleString("en-IN")}`;
  }

  if (num < 10000000) {
    const lakhs = num / 100000;
    return `₹ ${lakhs.toFixed(5).replace(/\.?0+$/, "")}L`;
  }

  const crores = num / 10000000;
  return `₹ ${crores.toFixed(5).replace(/\.?0+$/, "")}Cr`;
};

  return (
    <div className="w-full lg:w-full md:w-full">
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
        <div className="relative">
          <FilterSelect value={dateFilter} onChange={(v) => { setDateFilter(v); if (v !== "custom") setDateDropdownOpen(false); else setDateDropdownOpen(true); }}>
            <option value="all">All Time</option>
            <option value="this_month">Current Month</option>
            <option value="last_month">Previous Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="custom">Custom</option>
          </FilterSelect>
          {dateFilter === "custom" && dateDropdownOpen && (
            <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
              <MonthRangeSelector from={periodRange.from} to={periodRange.to} onChange={setPeriodRange} onComplete={() => setDateDropdownOpen(false)} />
            </div>
          )}
        </div>
        <CreateButton onClick={openCreate} label="Create" icon={Plus} />
      </TabActionBar>

      <FilterChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Gross" value={`₹ ${totalGross.toLocaleString("en-IN")}`} valueClass="text-gray-700" />
        <StatCard label="Total TDS" value={`₹ ${totalTds.toLocaleString("en-IN")}`} valueClass="text-red-600" />
        <StatCard label="Total Reimbursement Pay" value={`₹ ${totalrememb.toLocaleString("en-IN")}`} valueClass="text-green-600" />
        <StatCard label="Total Net Pay" value={`₹ ${totalNet.toLocaleString("en-IN")}`} valueClass="text-indigo-700" />
      </div>
       {/* <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Total Records" value={filtered.length} />
        <StatCard label="Total Gross" value={` ${formatCompactINR(totalGross)}`} valueClass="text-gray-700" />
        <StatCard label="Total TDS" value={`${formatCompactINR(totalTds)}`} valueClass="text-red-600" />
        <StatCard label="Total Reimbursement" value={`${formatCompactINR(totalrememb)}`} valueClass="text-green-600" />
        <StatCard label="Total Net Pay" value={`${formatCompactINR(totalNet)}`} valueClass="text-indigo-700" />
        <StatCard label="Paid" value={filtered.filter((r) => r.status === "Paid").length} valueClass="text-green-600" />
      </div> */}

      <DataTable isLoading={isLoading} data={paginated} rowKey={getId} columns={columns}
        renderExpanded={(r) => (
          <div className="p-4 rounded-2xl bg-[#ECEEF2]">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <InfoCard label="Department" value={r.department || "-"} />
              <InfoCard label="Gross Salary" value={`₹ ${fmt(r.gross_salary)}`} />
              <InfoCard label="TDS" value={`₹ ${fmt(calcTdsAmount(r))}`} />
              <InfoCard label="Reimbursement" value={`₹ ${fmt(r.reimbursement)}`} />
              <InfoCard label="Professional Tax" value={`₹ ${fmt(r.professional_tax)}`} />
              <InfoCard label="Net Salary" value={`₹ ${fmt(r.net_salary)}`} valueClassName="text-indigo-700 font-bold" />
              <InfoCard label="TDS Section (Old)" value={r.tds_section_old || "-"} />
              <InfoCard label="TDS Section (New)" value={r.tds_section_new || "-"} />
              <InfoCard label="Nature of Payment" value={r.tds_section_nature || "-"} className="xl:col-span-2" />
            </div>
          </div>
        )}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {modal && (
        <Modal title={modal.mode === "create" ? "Add Salary Entry" : "Edit Salary Record"} onClose={closeModal} onSave={handleSave}>
          <FormField label="Employee" colSpan>
            {modal.mode === "create" ? (
              <EmployeeSearchSelect
                employees={employees}
                empLoading={empLoading}
                value={form.emp_name}
                onSelect={(emp) => {
                  if (emp._manualName !== undefined) {
                    setForm((p) => ({ ...p, emp_name: emp._manualName, emp_id: "", department: "" }));
                  } else {
                    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                    const empObjId = emp._id?.$oid || emp._id || "";
                    setForm((p) => ({ ...p, emp_name: name, emp_id: emp.emp_id || "", employeeId: empObjId, department: emp.department || "", _manual: false }));
                  }
                }}
                manual={form._manual}
                onToggleManual={(v) => setForm((p) => ({ ...p, _manual: v, emp_name: "", emp_id: "", department: "" }))}
              />
            ) : (
              <input type="text" name="emp_name" value={form.emp_name} onChange={handleChange} className={inputCls} />
            )}
          </FormField>
          {[
            { label: "Employee ID", name: "emp_id", type: "text" },
            { label: "Department", name: "department", type: "text" },
            { label: "Gross Salary (₹)", name: "gross_salary", type: "number" },
            { label: "Reimbursement (₹)", name: "reimbursement", type: "number" },
          ].map(({ label, name, type }) => (
            <FormField key={name} label={label}>
              <input type={type} name={name} value={form[name]} onChange={handleChange} className={inputCls} />
            </FormField>
          ))}

          <FormField label="TDS Section" colSpan>
            <TdsSectionSelect
              value={form.tds_section_key}
              onChange={(key, rate, section) => {
                const gross = parseFloat(form.gross_salary) || 0;
                const rateNum = parseFloat(section?.rateNum || rate) || 0;
                const computedTds = ((gross * rateNum) / 100).toFixed(2);
                setForm((prev) => ({
                  ...prev,
                  tds_section_key: key,
                  tds_section_new: section?.newSection || "",
                  tds_section_old: section?.oldSection || "",
                  tds_section_nature: section?.nature || "",
                  tds: computedTds,
                  _tdsManual: false,
                }));
              }}
              inputCls={inputCls}
            />
            {form.tds_section_key && (() => {
              const s = TDS_FLAT_LIST.find((s) => s.code === form.tds_section_key);
              return s ? (
                <p className="mt-1 text-xs text-gray-500">
                  <span className="font-semibold text-blue-700">{s.newSection}</span>
                  <span className="text-gray-400 ml-1">({s.oldSection})</span>
                  {" — "}{s.nature}
                  {" — TDS: "}<span className="font-semibold text-indigo-600">{s.rate}</span>
                </p>
              ) : null;
            })()}
          </FormField>
          <FormField label="Professional Tax (₹)">
            <input
              readOnly
              value={`₹ ${professionalTax.toLocaleString("en-IN")}`}
              className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
            />
          </FormField>
          <FormField label="TDS Deducted (₹)">
            <input
              type="number"
              min="0"
              step="any"
              name="tds"
              value={form.tds}
              onChange={handleChange}
              className={`${inputCls} text-red-600 font-semibold`}
            />
          </FormField>
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
          <FormField label="Salary Payable">
            <input readOnly value={`₹ ${netAuto.toLocaleString("en-IN")}`} className={`${inputCls} bg-gray-50 text-indigo-700 font-semibold`} />
          </FormField>
        </Modal>
      )}

      {statusPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Salary Status</h3>
            <select value={statusPopup.status} onChange={(e) => setStatusPopup((p) => ({ ...p, status: e.target.value, paid_on: e.target.value !== "Paid" ? "" : p.paid_on }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="YetToBePaid">Yet To Be Paid</option>
              <option value="Paid">Paid</option>
              <option value="OnHold">On Hold</option>
              <option value="Settlement">Settlement</option>
            </select>
            {statusPopup.status === "Paid" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">Paid On</label>
                <input type="date" value={statusPopup.paid_on} onChange={(e) => setStatusPopup((p) => ({ ...p, paid_on: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setStatusPopup(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleStatusSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete salary record for <span className="font-medium">{deleteModal.name}</span>?</>}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
      {payslipModal && (
        <Modal
          title={`Payslip - ${payslipModal.emp_name}`}
          onClose={() => setPayslipModal(null)}
        >
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <ReceiptText className="w-8 h-8 text-indigo-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-800">
              Payslip Component Coming Soon
            </h3>

            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              Later we will attach dedicated payslip component here.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
