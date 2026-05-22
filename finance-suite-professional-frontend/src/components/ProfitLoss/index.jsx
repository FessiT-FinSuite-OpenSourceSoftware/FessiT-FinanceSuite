import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChevronDown, ChevronRight, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (n) => {
  const val = Number(n) || 0;
  const abs = Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val < 0 ? `-₹${abs}` : `₹${abs}`;
};

const pct = (n) => `${((Number(n) || 0) * 100).toFixed(1)}%`;

const fmtDate = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return value; }
};

const fmtPeriod = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value + "-01");
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "long" });
  } catch { return value; }
};

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  if (/^\d{4}-\d{2}$/.test(value)) {
    const monthDate = new Date(`${value}-01`);
    return Number.isNaN(monthDate.getTime()) ? null : monthDate;
  }
  return null;
};

const fmtMonthLabel = (date) => date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

const chartTooltipFormatter = (value, name) => {
  const labels = {
    revenue: "Revenue",
    costOfRevenue: "Cost",
    grossProfit: "Gross Profit",
    totalExpenses: "Total Expenses",
    netProfit: "Net Profit",
  };
  return [fmt(value), labels[name] || name];
};

const currentFY = () => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

const fyOptions = Array.from({ length: 5 }, (_, i) => {
  const y = currentFY() - i;
  return { value: y, label: `FY ${y}-${String(y + 1).slice(-2)}` };
});

function KpiCard({ label, value, sub, positive, icon: Icon }) {
  const color = positive === undefined ? "text-gray-900" : positive ? "text-green-600" : "text-red-600";
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Section({ title, total, children, accent = "indigo", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    red:    "bg-red-50 border-red-200 text-red-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    green:  "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colors[accent]}`}>
          Total: {fmt(total)}
        </span>
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

function ItemTable({ columns, rows, emptyMsg = "No records in this period." }) {
  if (!rows?.length) return <p className="px-5 py-4 text-sm text-gray-400 italic">{emptyMsg}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide ${c.right ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2 text-gray-700 ${c.right ? "text-right font-medium" : ""} ${c.mono ? "font-mono text-xs text-indigo-600" : ""}`}>
                  {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProfitLossPage() {
  const [fy, setFy]           = useState(currentFY());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (fyYear) => {
    setLoading(true);
    try {
      const { data: res } = await axiosInstance.get("/reports/profit-loss", { params: { fy: fyYear } });
      setData(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load P&L report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(fy); }, [fy, load]);

  // ── Map new response shape to familiar variable names ──────────────────────
  const summary  = data?.summary;
  const revenue  = data?.revenue;
  const expenses = data?.expenses;
  const meta     = data?.meta;

  // Old KPI names — derived from new response
  const kpis = summary ? {
    revenue:          summary.revenue,
    cost_of_revenue:  expenses?.incoming_invoices?.total || 0,
    gross_profit:     summary.revenue - (expenses?.incoming_invoices?.total || 0),
    gross_margin:     summary.revenue > 0
      ? (summary.revenue - (expenses?.incoming_invoices?.total || 0)) / summary.revenue
      : 0,
    total_expenses:   summary.total_expenses,
    operating_profit: summary.net_profit,
    net_profit:       summary.net_profit,
    net_margin:       summary.net_margin_pct,
  } : null;

  // Old section names — derived from new response
  const sec = expenses ? {
    income: {
      total: revenue?.total || 0,
      items: revenue?.items || [],
    },
    direct_costs: {
      total:        expenses.incoming_invoices?.total || 0,
      items:        expenses.incoming_invoices?.items || [],
      gross_profit: (summary?.revenue || 0) - (expenses.incoming_invoices?.total || 0),
    },
    operating_expenses: {
      total:             (expenses.employee_expenses?.total || 0) + (expenses.general_expenses?.total || 0) + (expenses.payroll?.gross_total || 0),
      operating_profit:  summary?.net_profit || 0,
      employee_expenses: expenses.employee_expenses,
      general_expenses:  expenses.general_expenses,
      payroll:           expenses.payroll,
    },
  } : null;

  const counts = data ? {
    revenue_invoices:  revenue?.count || 0,
    incoming_invoices: expenses?.incoming_invoices?.count || 0,
    employee_expenses: expenses?.employee_expenses?.count || 0,
    general_expenses:  expenses?.general_expenses?.count || 0,
    salary_records:    expenses?.payroll?.count || 0,
  } : null;

  const revenueTrendData = useMemo(() => {
    const points = {};
    const addPoints = (items = [], key) => {
      items.forEach((item) => {
        const date = parseDateValue(item.date || item.period);
        if (!date) return;
        const label = fmtMonthLabel(date);
        const existing = points[label] || { month: label, timestamp: date.getTime(), revenue: 0, costOfRevenue: 0 };
        existing[key] += Number(item.amount_inr ?? item.amount ?? 0) || 0;
        points[label] = existing;
      });
    };
    addPoints(revenue?.items, "revenue");
    addPoints(expenses?.incoming_invoices?.items, "costOfRevenue");
    const sorted = Object.values(points)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ timestamp, ...rest }) => rest);
    if (!sorted.length) {
      sorted.push({ month: "FY", revenue: summary?.revenue || 0, costOfRevenue: expenses?.incoming_invoices?.total || 0 });
    }
    return sorted;
  }, [revenue?.items, expenses?.incoming_invoices?.items, summary?.revenue, expenses?.incoming_invoices?.total]);

  const expenseBreakdown = useMemo(() => [
    { name: "Employee Expenses", value: expenses?.employee_expenses?.total || 0, color: "#4f46e5" },
    { name: "General Expenses", value: expenses?.general_expenses?.total || 0, color: "#f97316" },
    { name: "Payroll", value: expenses?.payroll?.gross_total || 0, color: "#10b981" },
    { name: "Cost of Revenue", value: expenses?.incoming_invoices?.total || 0, color: "#dc2626" },
    { name: "Revenue", value: summary?.revenue || 0, color: "#6366f1" },
  ].filter((item) => item.value > 0), [expenses?.employee_expenses?.total, expenses?.general_expenses?.total, expenses?.payroll?.gross_total, expenses?.incoming_invoices?.total, summary?.revenue]);

  const salesTrendData = useMemo(() => {
    const points = {};
    (revenue?.items || []).forEach((item) => {
      const date = parseDateValue(item.date || item.period);
      if (!date) return;
      const label = fmtMonthLabel(date);
      const existing = points[label] || { month: label, timestamp: date.getTime(), sales: 0 };
      existing.sales += Number(item.amount_inr ?? item.amount ?? 0) || 0;
      points[label] = existing;
    });
    const sorted = Object.values(points)
      .sort((a, b) => a.timestamp - b.timestamp);
    const latestSix = sorted.slice(-6);
    return latestSix.map(({ timestamp, ...rest }) => rest);
  }, [revenue?.items]);

  return (
    <div className=" w-full space-y-4">

      {/* Header / filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Financial Year</label>
          <select
            value={fy}
            onChange={(e) => setFy(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            {fyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {meta && (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-400">Period</p>
            <p className="text-sm font-medium text-gray-700">
              {meta.report.period.from} → {meta.report.period.to}
            </p>
            <p className="text-xs text-gray-400">{meta.report.basis} basis · {meta.report.status}</p>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={() => load(fy)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400 text-sm">
          Loading report...
        </div>
      )}

      {!loading && data && kpis && sec && counts && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Revenue"        value={fmt(kpis.revenue)}        sub={`${counts.revenue_invoices} invoices`}  icon={TrendingUp}   positive={kpis.revenue > 0} />
            <KpiCard label="Gross Profit"   value={fmt(kpis.gross_profit)}   sub={`Margin: ${pct(kpis.gross_margin)}`}                        positive={kpis.gross_profit >= 0} />
            <KpiCard label="Total Expenses" value={fmt(kpis.total_expenses)}                                               icon={TrendingDown}  positive={false} />
            <KpiCard label="Net Profit"     value={fmt(kpis.net_profit)}     sub={`Margin: ${pct(kpis.net_margin)}`}                          positive={kpis.net_profit >= 0} />
          </div>

          {/* Summary strip */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                { label: "Revenue",            value: fmt(kpis.revenue),           color: "text-indigo-700" },
                { label: "Cost of Revenue",    value: fmt(kpis.cost_of_revenue),   color: "text-red-600" },
                { label: "Gross Profit",       value: fmt(kpis.gross_profit),      color: kpis.gross_profit  >= 0 ? "text-green-600" : "text-red-600" },
                { label: "Operating Expenses", value: fmt(kpis.total_expenses),    color: "text-orange-600" },
                { label: "Net Profit",         value: fmt(kpis.net_profit),        color: kpis.net_profit    >= 0 ? "text-green-700" : "text-red-700" },
              ].map((item) => (
                <div key={item.label} className="px-5 py-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid gap-4 xl:grid-cols-3"
          >
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">P&amp;L Breakdown</p>
                  <p className="text-xs text-gray-400">Pie chart showing revenue and expense categories</p>
                </div>
                <div className="text-xs text-gray-500">{expenseBreakdown.length} segments</div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={4}
                      stroke="transparent"
                    >
                      {expenseBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [fmt(value), name]} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Sales Monthwise</p>
                  <p className="text-xs text-gray-400">Revenue trend for the selected year</p>
                </div>
                <div className="text-xs text-gray-500">{salesTrendData.length} months</div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip formatter={(value) => [fmt(value), "Sales"]} />
                    <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Income */}
          <Section title="Income (Revenue)" total={sec.income.total} accent="indigo" defaultOpen>
            <ItemTable
              columns={[
                { key: "date",           label: "Date",       fmt: fmtDate },
                { key: "ref",            label: "Invoice No", mono: true },
                { key: "party",          label: "Customer" },
                { key: "type",           label: "Type" },
                { key: "currency",       label: "Currency" },
                { key: "amount_foreign", label: "Amount",     right: true, fmt: fmt },
                { key: "fx_rate",        label: "FX Rate",    right: true, fmt: (v) => Number(v).toFixed(4) },
                { key: "amount_inr",     label: "INR Amount", right: true, fmt: fmt },
              ]}
              rows={sec.income.items}
            />
            <div className="flex justify-end px-5 py-3 border-t border-gray-100 bg-indigo-50">
              <span className="text-sm font-bold text-indigo-700">Total Revenue: {fmt(sec.income.total)}</span>
            </div>
          </Section>

          {/* Direct Costs — Incoming Invoices */}
          <Section title="Cost of Revenue — Incoming Invoices (Paid)" total={sec.direct_costs.total} accent="red">
            <ItemTable
              columns={[
                { key: "date",   label: "Date",       fmt: fmtDate },
                { key: "ref",    label: "Invoice No", mono: true },
                { key: "vendor", label: "Vendor" },
                { key: "amount", label: "Amount",     right: true, fmt: fmt },
              ]}
              rows={sec.direct_costs.items}
            />
            <div className="flex justify-between px-5 py-3 border-t border-gray-100 bg-red-50">
              <span className="text-sm font-bold text-red-700">Total Direct Costs: {fmt(sec.direct_costs.total)}</span>
              <span className={`text-sm font-bold ${sec.direct_costs.gross_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                Gross Profit: {fmt(sec.direct_costs.gross_profit)}
              </span>
            </div>
          </Section>

          {/* Operating Expenses */}
          <Section title="Operating Expenses" total={sec.operating_expenses.total} accent="orange">

            {/* Employee Expenses */}
            <div className="border-b border-gray-100">
              <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Employee Expenses ({counts.employee_expenses})
              </p>
              <ItemTable
                columns={[
                  { key: "date",     label: "Date",     fmt: fmtDate },
                  { key: "title",    label: "Title" },
                  { key: "category", label: "Category" },
                  { key: "vendor",   label: "Vendor" },
                  { key: "amount",   label: "Amount",   right: true, fmt: fmt },
                ]}
                rows={sec.operating_expenses.employee_expenses.items}
              />
              <div className="flex justify-end px-5 py-2 bg-orange-50">
                <span className="text-xs font-semibold text-orange-700">Subtotal: {fmt(sec.operating_expenses.employee_expenses.total)}</span>
              </div>
            </div>

            {/* General Expenses */}
            <div className="border-b border-gray-100">
              <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                General Expenses ({counts.general_expenses})
              </p>
              <ItemTable
                columns={[
                  { key: "date",     label: "Date",     fmt: fmtDate },
                  { key: "title",    label: "Title" },
                  { key: "category", label: "Category" },
                  { key: "amount",   label: "Amount",   right: true, fmt: fmt },
                ]}
                rows={sec.operating_expenses.general_expenses.items}
              />
              <div className="flex justify-end px-5 py-2 bg-orange-50">
                <span className="text-xs font-semibold text-orange-700">Subtotal: {fmt(sec.operating_expenses.general_expenses.total)}</span>
              </div>
            </div>

            {/* Payroll */}
            <div>
              <p className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Payroll / Salaries ({counts.salary_records})
              </p>
              <ItemTable
                columns={[
                  { key: "period",       label: "Period",     fmt: fmtPeriod },
                  { key: "emp_name",     label: "Employee" },
                  { key: "emp_id",       label: "Emp ID",     mono: true },
                  { key: "department",   label: "Department" },
                  { key: "gross_salary", label: "Gross",      right: true, fmt: fmt },
                  { key: "tds",          label: "TDS",        right: true, fmt: fmt },
                  { key: "net_salary",   label: "Net",        right: true, fmt: fmt },
                ]}
                rows={sec.operating_expenses.payroll.items}
              />
              <div className="flex justify-end gap-6 px-5 py-2 bg-orange-50 text-xs font-semibold text-orange-700">
                <span>Gross (Cost): {fmt(sec.operating_expenses.payroll.gross_total)}</span>
                <span>TDS: {fmt(sec.operating_expenses.payroll.tds_total)}</span>
                <span>Net Paid: {fmt(sec.operating_expenses.payroll.net_total)}</span>
              </div>
            </div>

            <div className="flex justify-between px-5 py-3 border-t border-gray-200 bg-orange-50">
              <span className="text-sm font-bold text-orange-700">Total Operating Expenses: {fmt(sec.operating_expenses.total)}</span>
              <span className={`text-sm font-bold ${sec.operating_expenses.operating_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                Operating Profit: {fmt(sec.operating_expenses.operating_profit)}
              </span>
            </div>
          </Section>

          {/* Net Profit banner */}
          <div className={`rounded-xl border-2 shadow-sm p-5 flex items-center justify-between ${kpis.net_profit >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit / Loss</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {meta?.report?.fy} · Revenue {fmt(kpis.revenue)} − Expenses {fmt(kpis.total_expenses)}
              </p>
            </div>
            <p className={`text-3xl font-bold ${kpis.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmt(kpis.net_profit)}
            </p>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How this report is calculated</p>
            <div className="space-y-2">
              {data.notes.map((n, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-semibold text-gray-700 whitespace-nowrap min-w-40">{n.title}</span>
                  <span className="text-gray-500">{n.rule} · Date: <span className="font-mono text-xs text-indigo-600">{n.date}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Net Profit = Revenue − (Incoming Invoices + Employee Expenses + General Expenses + Payroll Gross)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
