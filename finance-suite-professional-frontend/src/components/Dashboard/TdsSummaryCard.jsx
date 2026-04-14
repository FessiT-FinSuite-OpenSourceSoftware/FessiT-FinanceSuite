import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTdsSummary, tdsSummarySelector } from "../../ReduxApi/tdsSummary";

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TdsSummaryCard() {
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useSelector(tdsSummarySelector);

  useEffect(() => {
    dispatch(fetchTdsSummary());
  }, [dispatch]);

  const inv  = data?.incoming_invoices;
  const sal  = data?.salaries;
  const comb = data?.combined;

  const month = data?.month
    ? new Date(data.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
    : "This Month";

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <p className="text-sm text-gray-500">Loading TDS summary...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <p className="text-sm text-red-500">Failed to load TDS summary.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">TDS Compliance — {month}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Current Month</span>
      </div>

      {/* Breakdown table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Count</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Total TDS Deducted</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">TDS on Paid</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">TDS Pending</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm font-medium text-gray-700">Incoming Invoices (TDS Applicable)</td>
              <td className="py-3 px-4 text-sm text-gray-600 text-right">{inv?.invoice_count ?? 0} invoices</td>
              <td className="py-3 px-4 text-sm font-semibold text-red-600 text-right">{fmt(inv?.total_tds_deducted)}</td>
              <td className="py-3 px-4 text-sm text-green-600 text-right">{fmt(inv?.tds_on_paid)}</td>
              <td className="py-3 px-4 text-sm text-yellow-600 text-right">{fmt(inv?.tds_pending)}</td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm font-medium text-gray-700">Salaries (TDS Deducted)</td>
              <td className="py-3 px-4 text-sm text-gray-600 text-right">{sal?.salary_count ?? 0} records</td>
              <td className="py-3 px-4 text-sm font-semibold text-red-600 text-right">{fmt(sal?.total_tds_deducted)}</td>
              <td className="py-3 px-4 text-sm text-green-600 text-right">{fmt(sal?.tds_on_paid)}</td>
              <td className="py-3 px-4 text-sm text-yellow-600 text-right">{fmt(sal?.tds_pending)}</td>
            </tr>
            {/* Combined row */}
            <tr className="bg-red-50">
              <td className="py-3 px-4 text-sm font-bold text-red-700">Combined Total</td>
              <td className="py-3 px-4 text-sm text-red-600 text-right">
                {(inv?.invoice_count ?? 0) + (sal?.salary_count ?? 0)} records
              </td>
              <td className="py-3 px-4 text-sm font-bold text-red-700 text-right">{fmt(comb?.total_tds_deducted)}</td>
              <td className="py-3 px-4 text-sm font-bold text-green-700 text-right">{fmt(comb?.tds_on_paid)}</td>
              <td className="py-3 px-4 text-sm font-bold text-yellow-700 text-right">{fmt(comb?.tds_pending)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium mb-1">Total TDS Deducted</p>
          <p className="text-lg font-bold text-red-700">{fmt(comb?.total_tds_deducted)}</p>
          <p className="text-xs text-red-400 mt-1">Invoices + Salaries</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium mb-1">TDS Remitted (Paid)</p>
          <p className="text-lg font-bold text-green-700">{fmt(comb?.tds_on_paid)}</p>
          <p className="text-xs text-green-400 mt-1">From paid records</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs text-yellow-600 font-medium mb-1">TDS Pending</p>
          <p className="text-lg font-bold text-yellow-700">{fmt(comb?.tds_pending)}</p>
          <p className="text-xs text-yellow-400 mt-1">Yet to be remitted</p>
        </div>
      </div>
    </div>
  );
}
