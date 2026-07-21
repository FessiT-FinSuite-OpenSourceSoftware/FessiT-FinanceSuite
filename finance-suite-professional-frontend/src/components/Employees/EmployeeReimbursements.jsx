import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { expenseSelector, fetchExpenseData } from "../../ReduxApi/expense";
import { generalExpenseSelector, fetchGeneralExpenses } from "../../ReduxApi/generalExpense";
import { fetchAllEmployees } from "../../ReduxApi/employee";
import { DonutChart } from "../../shared/charts";
import { FilterSelect, StatCard } from "../../shared/ui";

const parseAmt = (v) => parseFloat(v) || 0;
const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const yFmt = (v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  }
  if (period === "last_month") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
  }
  const n = { "3m": 3, "6m": 6, "12m": 12 }[period];
  return { from: new Date(now.getFullYear(), now.getMonth() - n, 1), to: now };
};

const CHART_CARD = "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900 p-4 h-64 flex flex-col";

export default function EmployeeReimbursements() {
  const dispatch = useDispatch();
  const { expenseData = [] } = useSelector(expenseSelector);
  const { generalExpenseData = [], employees = [] } = useSelector(generalExpenseSelector);

  const [selectedEmp, setSelectedEmp] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");

  useEffect(() => {
    dispatch(fetchExpenseData());
    dispatch(fetchGeneralExpenses()); // also fetches & caches employees in generalExpense slice
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

  const filteredGeneral = useMemo(() => {
    const range = getCutoffDate(timePeriod);
    return generalExpenseData.filter((e) => {
      if (selectedEmp !== "all" && e.paid_by_employee_id !== selectedEmp) return false;
      if (!range) return true;
      const d = e.date ? new Date(e.date) : null;
      if (!d || isNaN(d)) return false;
      d.setHours(0, 0, 0, 0);
      return d >= range.from && d <= range.to;
    });
  }, [generalExpenseData, selectedEmp, timePeriod]);

  const reimbByCategory = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      (e.items || []).forEach((item) => {
        const cat = item.expenseCategory || item.expense_category || "Other";
        map[cat] = (map[cat] || 0) + parseAmt(item.amount);
      });
      if (!e.items?.length) map["Other"] = (map["Other"] || 0) + parseAmt(e.total_amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const genByCategory = useMemo(() => {
    const map = {};
    filteredGeneral.forEach((e) => {
      const cat = e.category || "Other";
      map[cat] = (map[cat] || 0) + parseAmt(e.subTotal);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [filteredGeneral]);

  // Combined monthly trend — one entry per month with both series
  const combinedTrend = useMemo(() => {
    const reimb = Object.fromEntries(months.map((m) => [m, 0]));
    const gen = Object.fromEntries(months.map((m) => [m, 0]));
    filtered.forEach((e) => {
      const ym = toYM(e.items?.[0]?.expense_date || e.items?.[0]?.expenseDate || e.created_at);
      if (ym && reimb[ym] !== undefined) reimb[ym] += parseAmt(e.total_amount);
    });
    filteredGeneral.forEach((e) => {
      const ym = toYM(e.date);
      if (ym && gen[ym] !== undefined) gen[ym] += parseAmt(e.amount);
    });
    return months.map((ym) => {
      const [y, m] = ym.split("-");
      return { name: `${MONTHS_SHORT[+m - 1]} ${y.slice(2)}`, reimbursements: Math.round(reimb[ym]), general: Math.round(gen[ym]) };
    });
  }, [filtered, filteredGeneral, months]);

  const reimbTotal = filtered.reduce((s, e) => s + parseAmt(e.total_amount), 0);
  const genTotal = filteredGeneral.reduce((s, e) => s + parseAmt(e.subTotal), 0);
  const reimbursedCount = filtered.filter((e) => (e.status || "").toUpperCase() === "REIMBURSED").length;
  const approvedCount = filtered.filter((e) => (e.status || "").toUpperCase() === "APPROVED").length
    + filteredGeneral.filter((e) => e.status === "Approved").length;
  console.log("This is the filtration of the data ,", filteredGeneral)
  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-[88px] z-10 rounded-lg bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 py-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4">
          <FilterSelect value={selectedEmp} onChange={setSelectedEmp}>
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}{emp.emp_id ? ` (${emp.emp_id})` : ""}</option>
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

      {/* Single unified stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <StatCard label="Reimbursements" value={fmt(reimbTotal)} valueClass="text-indigo-700" />
        <StatCard label="General Expenses" value={fmt(genTotal)} valueClass="text-violet-600" />
        <StatCard label="Combined Total" value={fmt(reimbTotal + genTotal)} valueClass="text-slate-700 dark:text-slate-200" />
        <StatCard label="Approved" value={approvedCount} valueClass="text-green-600" />
        <StatCard label="Reimbursed" value={reimbursedCount} valueClass="text-purple-600" />
      </div>

      {/* Single chart row */}
      <div className="grid grid-cols-10 gap-4">
        {/* Reimbursements donut */}
        <div className="col-span-3">
          <DonutChart
            title="Reimbursements by Category"
            subtitle={fmt(reimbTotal)}
            data={reimbByCategory}
            tooltipLabel="Amount (₹)"
          />
        </div>

        {/* General expenses donut */}
        <div className="col-span-3">
          <DonutChart
            title="General Expenses by Category"
            subtitle={fmt(genTotal)}
            data={genByCategory}
            tooltipLabel="Amount (₹)"
            colors={["#a78bfa", "#f472b6", "#fb923c", "#38bdf8", "#4ade80"]}
          />
        </div>

        {/* Combined monthly bar */}
        <div className="col-span-4">
          <div className={CHART_CARD}>
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Monthly Trend</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 12 months</p>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={combinedTrend} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={1} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={36} />
                  <YAxis tickFormatter={yFmt} tick={{ fontSize: 10 }} width={36} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === "reimbursements" ? "Reimbursements" : "General"]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} formatter={(v) => v === "reimbursements" ? "Reimbursements" : "General Expenses"} />
                  <Bar dataKey="reimbursements" fill="#6366f1" maxBarSize={12} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="general" fill="#a78bfa" maxBarSize={12} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
