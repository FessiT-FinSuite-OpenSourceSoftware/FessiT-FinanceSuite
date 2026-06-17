import React, { useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { expenseSelector, fetchExpenseData } from "../../ReduxApi/expense";
import { generalExpenseSelector, fetchGeneralExpenses } from "../../ReduxApi/generalExpense";
import { salarySelector, fetchSalaries } from "../../ReduxApi/salary";
import { incomingInvoiceSelector, fetchIncomingInvoices } from "../../ReduxApi/incomingInvoice";
import { DonutChart, BarChartCard, PieChartCard } from "../../shared/charts";

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

// ── Tab-specific third charts ──────────────────────────────────────────────

const ReimbursementsByCategoryChart = React.memo(function ReimbursementsByCategoryChart({ expenseData }) {
  const data = useMemo(() => {
    const map = {};
    expenseData.forEach((e) => {
      (e.items || []).forEach((item) => {
        console.log("Just for ref", item)
        const cat = item.expenseCategory || item.expense_category || "Other";
        map[cat] = (map[cat] || 0) + parseAmt(item.subTotal);
      });
      if (!e.items?.length) map["Other"] = (map["Other"] || 0) + parseAmt(e.total_amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [expenseData]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
return <PieChartCard title="Reimbursements by Category" subtitle={fmt(total)} data={data} tooltipLabel="Amount (₹)" valueFormatter={fmt} />;
});


const InvoicesPaidUnpaidChart = React.memo(function InvoicesPaidUnpaidChart({ incomingData }) {
  const data = useMemo(() => {
    const paid = incomingData.filter((r) => r.status === "Paid").reduce((s, r) => s + parseAmt(r.total || r.total_amount), 0);
    const unpaid = incomingData.filter((r) => r.status !== "Paid").reduce((s, r) => s + parseAmt(r.total || r.total_amount), 0);
    return [
      { name: "Paid", value: Math.round(paid) },
      { name: "Unpaid", value: Math.round(unpaid) },
    ].filter((d) => d.value > 0);
  }, [incomingData]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
return <DonutChart title="Invoices — Paid vs Unpaid" subtitle={fmt(total)} data={data} colors={["#34d399", "#f87171"]} tooltipLabel="Amount (₹)" valueFormatter={fmt} />;
});


const SalaryByDeptChart = React.memo(function SalaryByDeptChart({ salaryData }) {
  const data = useMemo(() => {
    const map = {};
    salaryData.forEach((r) => {
      const dept = r.department || "Unassigned";
      const net = parseAmt(r.gross_salary) + parseAmt(r.reimbursement) - parseAmt(r.tds) - parseAmt(r.professional_tax);
      map[dept] = (map[dept] || 0) + net;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [salaryData]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
return <DonutChart title="Net Salary by Department" subtitle={fmt(total)} data={data} colors={["#6366f1", "#f97316", "#34d399", "#fbbf24", "#60a5fa", "#a855f7"]} tooltipLabel="Amount (₹)" valueFormatter={fmt} />;
});


const GeneralByCategoryChart = React.memo(function GeneralByCategoryChart({ generalExpenseData }) {
  const data = useMemo(() => {
    const map = {};
    generalExpenseData.forEach((r) => {
      const cat = r.category || "Other";
      map[cat] = (map[cat] || 0) + parseAmt(r.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [generalExpenseData]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
return <DonutChart title="General Expenses by Category" subtitle={fmt(total)} data={data} tooltipLabel="Amount (₹)" valueFormatter={fmt} />;
});

// ── Main component ─────────────────────────────────────────────────────────

export default function ExpenseAnalytics({ tab = "expenses" }) {
  const dispatch = useDispatch();
  const { expenseData = [] } = useSelector(expenseSelector);
  const { generalExpenseData = [] } = useSelector(generalExpenseSelector);
  const { salaryData = [] } = useSelector(salarySelector);
  const { data: incomingData = [] } = useSelector(incomingInvoiceSelector);

  useEffect(() => {
    dispatch(fetchExpenseData());
    dispatch(fetchGeneralExpenses());
    dispatch(fetchSalaries());
    dispatch(fetchIncomingInvoices());
  }, [dispatch]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);

  const currentYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const typeBreakdown = useMemo(() => {
    const reimb = expenseData.filter((e) => toYM(e.items?.[0]?.expense_date || e.items?.[0]?.expenseDate || e.created_at) === currentYM)
      .reduce((s, e) => s + parseAmt(e.total_amount), 0);
    const general = generalExpenseData.filter((r) => toYM(r.date) === currentYM)
      .reduce((s, r) => s + parseAmt(r.amount), 0);
    const salary = salaryData.filter((r) => r.period === currentYM)
      .reduce((s, r) => s + parseAmt(r.gross_salary) + parseAmt(r.reimbursement), 0);
    const invoices = incomingData.filter((r) => toYM(r.invoice_date || r.date) === currentYM)
      .reduce((s, r) => s + parseAmt(r.total || r.total_amount || r.amount) + (r.tds_applicable ? parseAmt(r.tds_total) : 0), 0);
    return [
      { name: "Salary", value: Math.round(salary) },
      { name: "Invoices", value: Math.round(invoices) },
      { name: "General", value: Math.round(general) },
      { name: "Reimbursements", value: Math.round(reimb) },
    ].filter((d) => d.value > 0);
  }, [expenseData, generalExpenseData, salaryData, incomingData, currentYM]);

  const monthlyTrend = useMemo(() => {
    const map = Object.fromEntries(months.map((m) => [m, 0]));
    expenseData.forEach((e) => {
      const ym = toYM(e.items?.[0]?.expense_date || e.items?.[0]?.expenseDate || e.created_at);
      if (ym && map[ym] !== undefined) map[ym] += parseAmt(e.total_amount);
    });
    generalExpenseData.forEach((r) => {
      const ym = toYM(r.date);
      if (ym && map[ym] !== undefined) map[ym] += parseAmt(r.amount);
    });
    salaryData.forEach((r) => {
      const ym = r.period;
      if (ym && map[ym] !== undefined) map[ym] += parseAmt(r.gross_salary) + parseAmt(r.reimbursement);
    });
    incomingData.forEach((r) => {
      const ym = toYM(r.invoice_date || r.date);
      if (ym && map[ym] !== undefined)
        map[ym] += parseAmt(r.total || r.total_amount || r.amount) + (r.tds_applicable ? parseAmt(r.tds_total) : 0);
    });
    return months.map((ym) => {
      const [y, m] = ym.split("-");
      return { name: `${MONTHS_SHORT[+m - 1]} ${y}`, value: Math.round(map[ym]) };
    });
  }, [expenseData, generalExpenseData, salaryData, incomingData, months]);

  const total = typeBreakdown.reduce((s, d) => s + d.value, 0);

const chart1 = <DonutChart title="Total Expenses" subtitle={`${MONTHS_SHORT[new Date().getMonth()]} ${new Date().getFullYear()} · ${fmt(total)}`} data={typeBreakdown} tooltipLabel="Amount (₹)" valueFormatter={fmt} />;
  const chart2 = <BarChartCard title="Monthly Spend Trend" subtitle="Last 6 months — all expense types" data={monthlyTrend} tooltipFormatter={(v) => [fmt(v), "Total"]} yTickFormatter={yFmt} />;

  const thirdChart = {
    expenses: <ReimbursementsByCategoryChart expenseData={expenseData} />,
    incoming: <InvoicesPaidUnpaidChart incomingData={incomingData} />,
    salary: <SalaryByDeptChart salaryData={salaryData} />,
    others: <GeneralByCategoryChart generalExpenseData={generalExpenseData} />,
  }[tab] ?? null;

  return (
   <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-2">
  <div className="lg:col-span-3">
    {chart1}
  </div>

  

  <div className="lg:col-span-3">
    {thirdChart}
  </div>
  <div className="lg:col-span-4">
    {chart2}
  </div>
</div>
  );
}
