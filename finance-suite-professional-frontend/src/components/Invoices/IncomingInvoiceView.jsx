import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import axiosInstance from "../../utils/axiosInstance";
import Logo from "../../assets/FessitLogoTrans.png";
import { formatNumber, getCurrencySymbol } from "../../utils/formatNumber";

async function generatePdf(invoiceNumber) {
  const element = document.getElementById("incoming-invoice-print-area");
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const pdf = new jsPDF("p", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 5;
  let iw = pw - m * 2, ih = (canvas.height * iw) / canvas.width;
  if (ih > ph - m * 2) { const r = (ph - m * 2) / ih; iw *= r; ih *= r; }
  pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", (pw - iw) / 2, (ph - ih) / 2, iw, ih);
  pdf.save(`incoming-invoice-${invoiceNumber || "invoice"}.pdf`);
}

async function printPdf(invoiceNumber) {
  const element = document.getElementById("incoming-invoice-print-area");
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const pdf = new jsPDF("p", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 5;
  let iw = pw - m * 2, ih = (canvas.height * iw) / canvas.width;
  if (ih > ph - m * 2) { const r = (ph - m * 2) / ih; iw *= r; ih *= r; }
  pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", (pw - iw) / 2, (ph - ih) / 2, iw, ih);
  pdf.autoPrint();
  const url = URL.createObjectURL(pdf.output("blob"));
  const w = window.open(url);
  if (!w) pdf.save(`incoming-invoice-${invoiceNumber || "invoice"}.pdf`);
}

export default function IncomingInvoiceView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/incoming-invoices/${id}`).then(({ data }) => setData(data));
  }, [id]);

  if (!data) return <div className="p-6 text-gray-500">Loading...</div>;

  const items = Array.isArray(data.items) ? data.items : [];
  const isDomestic = (data.invoice_type || "domestic") === "domestic";
  const currency = data.currency_type || "INR";
  const sym = getCurrencySymbol(currency);

  return (
    <div className="bg-gray-100 min-h-screen py-6 invoice-wrapper">
      {/* Top bar — matches invoiceReportGeneration exactly */}
      <div className="mx-auto mb-4 flex justify-between items-center print-hidden" style={{ maxWidth: "820px", padding: "0 1rem" }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => nav(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 hover:text-gray-900 transition-colors">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 select-none">Preview</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => printPdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">Print</button>
          <button onClick={() => generatePdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer">Download</button>
        </div>
      </div>

      {/* A4 printable area — matches invoiceReportGeneration exactly */}
      <div id="incoming-invoice-print-area" className="invoice-a4 mx-auto bg-white shadow-lg text-sm border-[1.4px] border-gray-400" style={{ padding: "1rem", maxWidth: "820px" }}>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Logo" className="h-12 object-contain" />
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-black-300">PURCHASE INVOICE</h2>
            <div className={`mt-1 inline-flex px-3 py-1 rounded-full text-xs font-semibold border border-gray-400 ${isDomestic ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
              {isDomestic ? "₹ Domestic" : "$ International"}
            </div>
          </div>
        </div>

        {/* Vendor + Invoice details — same 2-col border table as outgoing */}
        <div className="-mx-4 mb-6 text-xs text-gray-800">
          <table className="w-full border-t border-b border-gray-400 border-collapse">
            <tbody>
              <tr>
                <td className="w-1/2 align-top border-r border-gray-400 px-4 py-2">
                  <p className="font-semibold mb-1">Vendor Details</p>
                  <p><span className="font-semibold">Name</span><span className="ml-2">: {data.vendor_name || "-"}</span></p>
                  {data.vendor_gstin && <p><span className="font-semibold">GSTIN</span><span className="ml-2">: {data.vendor_gstin}</span></p>}
                  {data.vendor_address && <p className="whitespace-pre-line"><span className="font-semibold">Address</span><span className="ml-2">: {data.vendor_address}</span></p>}
                </td>
                <td className="w-1/2 align-top px-4 py-2">
                  <p><span className="font-semibold">Invoice No.</span><span className="ml-2">: {data.invoice_number || "-"}</span></p>
                  <p><span className="font-semibold">Invoice Date</span><span className="ml-2">: {data.invoice_date || "-"}</span></p>
                  <p><span className="font-semibold">Due Date</span><span className="ml-2">: {data.due_date || "-"}</span></p>
                  <p><span className="font-semibold">Place of Supply</span><span className="ml-2">: {data.place_of_supply || "-"}</span></p>
                  {data.purchase_order_id && <p><span className="font-semibold">PO ID</span><span className="ml-2">: {data.purchase_order_id}</span></p>}
                  <p><span className="font-semibold">Currency</span><span className="ml-2">: {currency}</span></p>
                  <p><span className="font-semibold">Status</span><span className="ml-2">: {data.status || "-"}</span></p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items table — same style as outgoing */}
        <table className="w-full border border-black border-collapse text-xs mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 px-2 py-1 text-center w-8">Sl</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Item &amp; Description</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-16">Qty</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">Rate</th>
              {isDomestic ? (
                <>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">CGST %</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">CGST Amt</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">SGST %</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">SGST Amt</th>
                </>
              ) : (
                <>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">IGST %</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">IGST Amt</th>
                </>
              )}
              <th className="border border-gray-400 px-2 py-1 text-center w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, i) => {
              const qty = parseFloat(item.quantity) || 0;
              const rate = parseFloat(item.rate) || 0;
              const base = qty * rate;
              const cgstAmt = isDomestic ? (base * (parseFloat(item.cgstPercent) || 0)) / 100 : 0;
              const sgstAmt = isDomestic ? (base * (parseFloat(item.sgstPercent) || 0)) / 100 : 0;
              const igstAmt = !isDomestic ? (base * (parseFloat(item.igstPercent) || 0)) / 100 : 0;
              const rowTotal = base + cgstAmt + sgstAmt + igstAmt;
              return (
                <tr key={i} className="align-top">
                  <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">{item.description}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{item.quantity}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{formatNumber(rate, currency)}</td>
                  {isDomestic ? (
                    <>
                      <td className="border border-gray-400 px-2 py-1 text-center">{item.cgstPercent || "0"}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{formatNumber(cgstAmt, currency)}</td>
                      <td className="border border-gray-400 px-2 py-1 text-center">{item.sgstPercent || "0"}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{formatNumber(sgstAmt, currency)}</td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-400 px-2 py-1 text-center">{item.igstPercent || "0"}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{formatNumber(igstAmt, currency)}</td>
                    </>
                  )}
                  <td className="border border-gray-400 px-2 py-1 text-right font-semibold">{formatNumber(rowTotal, currency)}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={isDomestic ? 9 : 7} className="border border-gray-400 px-2 py-4 text-center text-gray-500">No items added</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals + Notes — same 2-col layout as outgoing */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-xs text-gray-800">
            {data.notes && (
              <div>
                <h3 className="font-semibold mb-1">Notes / Terms &amp; Conditions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {data.notes.split("\n").filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-900">
            <div className="p-2 space-y-2 -mt-4">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">{sym} {formatNumber(data.subTotal || 0, currency)}</span>
              </div>
              <div className="border-t border-gray-400 my-1" />
              {isDomestic ? (
                <>
                  <div className="flex justify-between"><span>Total CGST</span><span className="font-semibold">{sym} {formatNumber(data.total_cgst || 0, currency)}</span></div>
                  <div className="flex justify-between"><span>Total SGST</span><span className="font-semibold">{sym} {formatNumber(data.total_sgst || 0, currency)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span>Total IGST</span><span className="font-semibold">{sym} {formatNumber(data.total_igst || 0, currency)}</span></div>
              )}
              <div className="flex justify-between border-t border-gray-400 pt-2 mt-2 text-sm">
                <span className="font-bold">Grand Total / Balance Due</span>
                <span className="font-extrabold text-indigo-700">{sym} {formatNumber(data.total || 0, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end mt-8">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-700 mb-16">Authorized By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-xs text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
