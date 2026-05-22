import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPtSummary, ptSummarySelector, ptSummaryClear } from "../../ReduxApi/ptSummary";
import { fetchSalaries, salarySelector } from "../../ReduxApi/salary";
import PTDeductions from "./PTDeductions";
import PtChallansTab from "./ptChallans";
import PeriodSelector from "../../shared/PeriodSelector";

const StatCardSkeleton = () => (
  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
    <div className="skeleton-shimmer h-2.5 w-24 mb-3" />
    <div className="skeleton-shimmer h-7 w-28 mb-2" />
    <div className="skeleton-shimmer h-2.5 w-36" />
  </div>
);

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export default function ProfessionalTaxCompliance() {
  const dispatch = useDispatch();
  const { data, isLoading } = useSelector(ptSummarySelector);
  const { salaryData } = useSelector(salarySelector);

  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState([{ year: now.getFullYear(), month: now.getMonth() + 1 }]);
  const [activeTab, setActiveTab] = useState("deductions");

  const handlePeriodChange = (months) => setSelectedMonths(months);

  useEffect(() => {
    if (!selectedMonths.length) return;
    dispatch(fetchPtSummary(selectedMonths));
  }, [dispatch, selectedMonths]);

  useEffect(() => {
    return () => { dispatch(ptSummaryClear()); };
  }, [dispatch]);

  useEffect(() => {
    if (!selectedMonths.length) return;
    if (selectedMonths.length === 1) {
      dispatch(fetchSalaries(selectedMonths[0].year, selectedMonths[0].month));
    } else {
      dispatch(fetchSalaries());
    }
  }, [dispatch, selectedMonths]);

  const dynamicDeductions = useMemo(() => {
    const monthSet = new Set(
      selectedMonths.map(({ year, month }) => `${year}-${String(month).padStart(2, "0")}`)
    );

    function inSelectedMonths(dateStr) {
      if (!dateStr) return false;
      const raw = String(dateStr).trim();
      if (/^\d{4}-\d{2}/.test(raw)) return monthSet.has(raw.slice(0, 7));
      if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return monthSet.has(`${raw.slice(6, 10)}-${raw.slice(3, 5)}`);
      if (/^\d{4}-\d{2}$/.test(raw)) return monthSet.has(raw);
      const d = new Date(raw);
      if (!isNaN(d)) return monthSet.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      return false;
    }

    return (Array.isArray(salaryData) ? salaryData : [])
      .filter((s) => {
        const pt = parseFloat(s.professional_tax || 0);
        return pt > 0 && inSelectedMonths(s.period);
      })
      .map((s) => ({
        id: `sal-${s._id?.$oid || s.emp_id}`,
        date: s.paid_on || (s.period ? `${s.period}-01` : null),
        period: s.period,
        emp_name: s.emp_name || "-",
        emp_id: s.emp_id || "-",
        department: s.department || "-",
        gross_salary: parseFloat(s.gross_salary || 0),
        reimbursement: parseFloat(s.reimbursement || 0),
        tds: parseFloat(s.tds || 0),
        ptAmount: parseFloat(s.professional_tax || 0),
        net_salary: parseFloat(s.net_salary || 0),
        status: s.status === "Paid" ? "paid" : "pending",
      }))
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });
  }, [salaryData, selectedMonths]);

  const totalPtDeducted = data?.total_pt_deducted ?? 0;
  const totalPtDeposited = 0;
  const pendingDeposit = dynamicDeductions
    .filter((d) => d.status === "pending")
    .reduce((s, d) => s + d.ptAmount, 0);
  const employeeCount = data?.salary_count ?? 0;

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 pb-6">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-3">
          <div className="flex">
            {[{ key: "deductions", label: "Deductions" }, { key: "challans", label: "Professional Tax Challans" }].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2 text-md font-medium transition-colors ${
                  activeTab === t.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-2">
          <PeriodSelector onChange={handlePeriodChange} />
        </div>

        {/* Stat Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2 transition-opacity duration-300 ${isLoading && data ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {!data ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div className="relative overflow-hidden group bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-blue-300 transition-all">
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total PT Deducted</p>
                  <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalPtDeducted)}</h3>
                </div>
              </div>
              <div className="relative overflow-hidden group bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-green-300 transition-all">
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total PT Deposited</p>
                  <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalPtDeposited)}</h3>
                </div>
              </div>
              <div className="relative overflow-hidden group bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-orange-300 transition-all">
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pending Deposit</p>
                  <h3 className="text-2xl font-black text-slate-900">{formatCurrency(pendingDeposit)}</h3>
                </div>
              </div>
              <div className="relative overflow-hidden group bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-purple-300 transition-all">
                <div className="relative z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Employees Covered</p>
                  <h3 className="text-2xl font-black text-slate-900">{employeeCount}</h3>
                </div>
              </div>
            </>
          )}
        </div>

        {activeTab === "deductions" && (
          <PTDeductions deductions={dynamicDeductions} isLoading={isLoading} selectedMonths={selectedMonths} />
        )}
        {activeTab === "challans" && <PtChallansTab />}
      </div>
    </>
  );
}
