import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { expenseSelector, fetchExpenseData } from "../../ReduxApi/expense";
import { fetchAllEmployees } from "../../ReduxApi/employee";
import { DonutChart, BarChartCard } from "../../shared/charts";
import { FilterSelect, StatCard } from "../../shared/ui";

const parseAmt = (v) => parseFloat(v) || 0;
const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const yFmt = (v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toYM = (dateStr) => {
  if (!dateStr) return null;
  try {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [, m, y] = dateStr.split("-");
      return `${y}-${m}`;
    }
    const d = new Date(dateStr);
    return isNaN(d) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch { return null; }
};

const getExpenseEmployeeId = (expense) => {
  const ae = expense.associatedEmployee ?? expense.associated_employee;
  if (!ae) return null;
  if (typeof ae === "string") return ae;
  if (ae.$oid) return ae.$oid;
  return null;
};

const getCutoffDate = (period) => {
  if (!period || period === "all") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to };
  }
  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from, to };
  }
  const months = { "3m": 3, "6m": 6, "12m": 12 }[period];
  const from = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return { from, to: now };
};

export default function EmployeeReimbursements() {
  const dispatch = useDispatch();
  const { expenseData = [] } = useSelector(expenseSelector);

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");

  useEffect(() => {
    dispatch(fetchExpenseData());
    dispatch(fetchAllEmployees()).then((data) => {
      setEmployees(Array.isArray(data) ? data : []);
    });
  }, [dispatch]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const filtered = useMemo(() => {
    const range = getCutoffDate(timePeriod);
    return expenseData.filter((e) => {
      if (selectedEmp !== "all" && getExpenseEmployeeId(e) !== selectedEmp) return false;
      if (range) {
        const ym = toYM(e.items?.[0]?.expense_date || e.items?.[0]?.expenseDate || e.created_at);
        if (!ym) return false;
        const d = new Date(ym + "-01");
        if (d < range.from || d > range.to) return false;
      }
      return true;
    });
  }, [expenseData, selectedEmp, timePeriod]);

  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      (e.items || []).forEach((item) => {
        const cat = item.expenseCategory || item.expense_category || "Other";
        map[cat] = (map[cat] || 0) + parseAmt(item.amount);
      });
      if (!e.items?.length) map["Other"] = (map["Other"] || 0) + parseAmt(e.total_amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const map = Object.fromEntries(months.map((m) => [m, 0]));
    filtered.forEach((e) => {
      const ym = toYM(e.items?.[0]?.expense_date || e.items?.[0]?.expenseDate || e.created_at);
      if (ym && map[ym] !== undefined) map[ym] += parseAmt(e.total_amount);
    });
    return months.map((ym) => {
      const [y, m] = ym.split("-");
      return { name: `${MONTHS_SHORT[+m - 1]} ${y.slice(2)}`, value: Math.round(map[ym]) };
    });
  }, [filtered, months]);

  const total = filtered.reduce((s, e) => s + parseAmt(e.total_amount), 0);
  const reimbursedCount = filtered.filter((e) => (e.status || "").toUpperCase() === "REIMBURSED").length;
  const approvedCount   = filtered.filter((e) => (e.status || "").toUpperCase() === "APPROVED").length;
  const selectedEmpName = employees.find((e) => e.id === selectedEmp)?.name;

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-[88px] z-10 rounded-lg bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 py-4 shadow-sm mb-2">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4">
          <FilterSelect value={selectedEmp} onChange={setSelectedEmp}>
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}{emp.emp_id ? ` (${emp.emp_id})` : ""}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={timePeriod} onChange={setTimePeriod}>
            <option value="all">All Time</option>
            <option value="this_month">Current Month</option>
            <option value="last_month">Previous Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
          </FilterSelect>
        </div>
      </div>

      {/* Stat cards — same as sales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Records"   value={filtered.length} />
        <StatCard label="Total Amount"    value={fmt(total)} valueClass="text-indigo-700" />
        <StatCard label="Approved"        value={approvedCount}   valueClass="text-green-600" />
        <StatCard label="Reimbursed"      value={reimbursedCount} valueClass="text-purple-600" />
      </div>

      {/* Charts */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
          <svg className="w-10 h-10 opacity-30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6M3 17h18" />
          </svg>
          <p className="text-sm">No reimbursements found for the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-10 sm:grid-cols-10 gap-4">
          <div className="col-span-3 sm:col-span-3">
          <DonutChart
            title="Reimbursements by Category"
            subtitle={selectedEmpName ? `${selectedEmpName} · ${fmt(total)}` : fmt(total)}
            data={byCategory}
            tooltipLabel="Amount (₹)"
          />
          </div>
          <div className="col-span-7">
          <BarChartCard
            title="Monthly Reimbursement Trend"
            subtitle="Last 12 months"
            data={monthlyTrend}
            tooltipFormatter={(v) => [fmt(v), "Amount"]}
            yTickFormatter={yFmt}
          />
          </div>
        </div>
      )}
    </div>
  );
}
