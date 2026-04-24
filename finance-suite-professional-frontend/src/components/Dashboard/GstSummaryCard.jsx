import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGstSummary, gstSummarySelector } from "../../ReduxApi/gstSummary";

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SectionRow = ({ label, cgst, sgst, igst, total, amount, count, countLabel = "records" }) => (
  <tr className="border-b border-gray-100 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm font-medium text-gray-700">{label}</td>
    <td className="py-3 px-4 text-sm text-gray-600 text-right">{count != null ? `${count} ${countLabel}` : "—"}</td>
    <td className="py-3 px-4 text-sm text-gray-600 text-right">{amount != null ? fmt(amount) : "—"}</td>
    <td className="py-3 px-4 text-sm text-gray-600 text-right">{fmt(cgst)}</td>
    <td className="py-3 px-4 text-sm text-gray-600 text-right">{fmt(sgst)}</td>
    <td className="py-3 px-4 text-sm text-gray-600 text-right">{fmt(igst)}</td>
    <td className="py-3 px-4 text-sm font-semibold text-blue-700 text-right">{fmt(total)}</td>
  </tr>
);

export default function GstSummaryCard() {
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useSelector(gstSummarySelector);

  useEffect(() => {
    dispatch(fetchGstSummary());
  }, [dispatch]);

  const inv  = data?.outgoing_invoices;
  const inc  = data?.incoming_invoices;
  const exp  = data?.expenses;
  const gen  = data?.general_expenses;
  const comb = data?.combined_expense_gst;
  const net  = data?.net_gst_payable;

  const month = data?.month
    ? new Date(data.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
    : "This Month";

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <p className="text-sm text-gray-500">Loading GST summary...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <p className="text-sm text-red-500">Failed to load GST summary.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">GST Summary — {month}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Current Month</span>
      </div>

      {/* Main breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Count</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">CGST</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">SGST</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">IGST</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-500 uppercase">GST Total</th>
            </tr>
          </thead>
          <tbody>
            <SectionRow
              label="Outgoing Invoices"
              count={inv?.invoice_count}
              countLabel="invoices"
              amount={inv?.paid_amount}
              cgst={inv?.total_cgst}
              sgst={inv?.total_sgst}
              igst={inv?.total_igst}
              total={inv?.total_gst_collected}
            />
            <SectionRow
              label="Incoming Invoices"
              count={inc?.invoice_count}
              countLabel="invoices"
              amount={inc?.total_amount}
              cgst={inc?.total_cgst}
              sgst={inc?.total_sgst}
              igst={inc?.total_igst}
              total={inc?.total_gst_collected}
            />
            <SectionRow
              label="Expenses (Reimbursed · Billed to Company)"
              count={exp?.expense_count}
              amount={exp?.total_amount}
              cgst={exp?.total_cgst}
              sgst={exp?.total_sgst}
              igst={exp?.total_igst}
              total={exp?.total_gst_collected}
            />
            <SectionRow
              label="General Expenses (Approved · Billed to Company)"
              count={gen?.expense_count}
              amount={gen?.total_amount}
              cgst={gen?.total_cgst}
              sgst={gen?.total_sgst}
              igst={gen?.total_igst}
              total={gen?.total_gst_collected}
            />
            {/* Combined subtotal — incoming invoices + expenses + general expenses */}
            <tr className="bg-orange-50 border-b border-orange-100">
              <td className="py-3 px-4 text-sm font-semibold text-orange-700">Combined (Incoming + Expenses)</td>
              <td className="py-3 px-4 text-sm text-orange-600 text-right">{comb?.expense_count} records</td>
              <td className="py-3 px-4 text-sm text-orange-600 text-right">{fmt(comb?.total_amount)}</td>
              <td className="py-3 px-4 text-sm text-orange-600 text-right">{fmt(comb?.total_cgst)}</td>
              <td className="py-3 px-4 text-sm text-orange-600 text-right">{fmt(comb?.total_sgst)}</td>
              <td className="py-3 px-4 text-sm text-orange-600 text-right">{fmt(comb?.total_igst)}</td>
              <td className="py-3 px-4 text-sm font-bold text-orange-700 text-right">{fmt(comb?.total_gst_collected)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Net GST Payable summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Outgoing GST Collected</p>
          <p className="text-base font-bold text-green-700">{fmt(net?.outgoing_gst_collected)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium mb-1">Incoming + Expense GST</p>
          <p className="text-base font-bold text-red-700">{fmt((net?.incoming_gst_collected || 0) + (net?.expense_gst_collected || 0))}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-medium mb-1">Incoming GST (Input Credit)</p>
          <p className="text-base font-bold text-orange-700">{fmt(net?.incoming_gst_collected)}</p>
        </div>
        <div className={`rounded-lg p-3 ${(net?.net_payable || 0) >= 0 ? "bg-blue-50" : "bg-purple-50"}`}>
          <p className={`text-xs font-medium mb-1 ${(net?.net_payable || 0) >= 0 ? "text-blue-600" : "text-purple-600"}`}>
            Net GST Payable
          </p>
          <p className={`text-base font-bold ${(net?.net_payable || 0) >= 0 ? "text-blue-700" : "text-purple-700"}`}>
            {fmt(net?.net_payable)}
          </p>
        </div>
      </div>
    </div>
  );
}
