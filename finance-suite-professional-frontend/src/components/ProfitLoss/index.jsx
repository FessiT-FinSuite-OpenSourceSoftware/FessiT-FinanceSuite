import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { ChevronDown, ChevronRight, Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (n) =>
  `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n) => `${((Number(n) || 0) * 100).toFixed(1)}%`;

const fmtDate = (value) => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return value; }
};

const fmtPeriod = (value) => {
  if (!value) return "—";
  try {
    const date = new Date(value + "-01");
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "long" });
  } catch { return value; }
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

function Section({ title, total, totalLabel = "Total", children, accent = "indigo", defaultOpen = false }) {
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
          {totalLabel}: {fmt(total)}
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
  const [fy, setFy] = useState(currentFY());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const res = await axiosInstance.get("/reports/profit-loss/pdf", {
        params: { fy },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `PnL_FY${fy}-${fy + 1}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("P&L PDF downloaded");
    } catch {
      toast.error("PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  const kpis = data?.kpis;
  const sec  = data?.sections;
  const meta = data?.meta;

  return (
    <div className="max-w-7xl w-full space-y-4">

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

        <button
          onClick={handlePdf}
          disabled={pdfLoading || !data}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {pdfLoading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400 text-sm">
          Loading report...
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Revenue"        value={fmt(kpis.revenue)}        sub={`${data.counts.revenue_invoices} invoices`}  icon={TrendingUp}   positive={kpis.revenue > 0} />
            <KpiCard label="Gross Profit"   value={fmt(kpis.gross_profit)}   sub={`Margin: ${pct(kpis.gross_margin)}`}                             positive={kpis.gross_profit >= 0} />
            <KpiCard label="Total Expenses" value={fmt(kpis.total_expenses)}                                                   icon={TrendingDown}  positive={false} />
            <KpiCard label="Net Profit"     value={fmt(kpis.net_profit)}     sub={`Margin: ${pct(kpis.net_margin)}`}                               positive={kpis.net_profit >= 0} />
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

          {/* Income */}
          <Section title="Income (Revenue)" total={sec.income.total} accent="indigo" defaultOpen>
            <ItemTable
              columns={[
                { key: "date",           label: "Date",       fmt: fmtDate },
                { key: "ref",            label: "Invoice No", mono: true },
                { key: "party",          label: "Customer" },
                { key: "currency",       label: "Currency" },
                { key: "amount_foreign", label: "Amount",     right: true, fmt: (v) => fmt(v) },
                { key: "fx_rate",        label: "FX Rate",    right: true, fmt: (v) => Number(v).toFixed(4) },
                { key: "amount_inr",     label: "INR Amount", right: true, fmt: (v) => fmt(v) },
              ]}
              rows={sec.income.items}
            />
            <div className="flex justify-end px-5 py-3 border-t border-gray-100 bg-indigo-50">
              <span className="text-sm font-bold text-indigo-700">Total Revenue: {fmt(sec.income.total)}</span>
            </div>
          </Section>

          {/* Direct Costs */}
          <Section title="Cost of Revenue (Direct Costs)" total={sec.direct_costs.total} accent="red">
            <ItemTable
              columns={[
                { key: "date",   label: "Date",   fmt: fmtDate },
                { key: "ref",    label: "Invoice No", mono: true },
                { key: "vendor", label: "Vendor" },
                { key: "amount", label: "Amount", right: true, fmt: (v) => fmt(v) },
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
                Employee Expenses ({data.counts.employee_expenses})
              </p>
              <ItemTable
                columns={[
                  { key: "date",     label: "Date",     fmt: fmtDate },
                  { key: "title",    label: "Title" },
                  { key: "category", label: "Category" },
                  { key: "vendor",   label: "Vendor" },
                  { key: "amount",   label: "Amount", right: true, fmt: (v) => fmt(v) },
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
                General Expenses ({data.counts.general_expenses})
              </p>
              <ItemTable
                columns={[
                  { key: "date",     label: "Date",     fmt: fmtDate },
                  { key: "title",    label: "Title" },
                  { key: "category", label: "Category" },
                  { key: "amount",   label: "Amount", right: true, fmt: (v) => fmt(v) },
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
                Payroll ({data.counts.salary_records})
              </p>
              <ItemTable
                columns={[
                  { key: "period",       label: "Period",     fmt: fmtPeriod },
                  { key: "emp_name",     label: "Employee" },
                  { key: "emp_id",       label: "Emp ID",    mono: true },
                  { key: "department",   label: "Department" },
                  { key: "gross_salary", label: "Gross",     right: true, fmt: (v) => fmt(v) },
                  { key: "tds",          label: "TDS",       right: true, fmt: (v) => fmt(v) },
                  { key: "net_salary",   label: "Net",       right: true, fmt: (v) => fmt(v) },
                ]}
                rows={sec.operating_expenses.payroll.items}
              />
              <div className="flex justify-end gap-6 px-5 py-2 bg-orange-50 text-xs font-semibold text-orange-700">
                <span>Gross: {fmt(sec.operating_expenses.payroll.gross_total)}</span>
                <span>TDS: {fmt(sec.operating_expenses.payroll.tds_total)}</span>
                <span>Net: {fmt(sec.operating_expenses.payroll.net_total)}</span>
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
              <p className="text-xs text-gray-400 mt-0.5">{meta?.report?.period?.fy} · {meta?.report?.basis} basis</p>
            </div>
            <p className={`text-3xl font-bold ${kpis.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {kpis.net_profit < 0 ? "-" : ""}{fmt(kpis.net_profit)}
            </p>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</p>
            <div className="space-y-2">
              {data.notes.map((n, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-medium text-gray-700 whitespace-nowrap">{n.title}:</span>
                  <span className="text-gray-500">{n.description}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
