import React from "react";
import Logo from "../../assets/FessitLogoTrans.png";
import { bankDetails } from "../Invoices/sampleInvoiceData";
import { formatNumber, getCurrencySymbol } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

async function generateEstimatePdf(estimateNumber) {
  try {
    const element = document.getElementById("estimate-print-area");
    if (!element) throw new Error("Estimate area not found");

    const canvas = await html2canvas(element, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;

    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > maxHeight) {
      const ratio = maxHeight / imgHeight;
      imgWidth *= ratio;
      imgHeight *= ratio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", x, y, imgWidth, imgHeight);
    pdf.save(`estimate-${estimateNumber || "estimate"}.pdf`);
  } catch (err) {
    alert(`Failed to generate PDF: ${err.message}`);
  }
}

async function printEstimatePdf(estimateNumber) {
  try {
    const element = document.getElementById("estimate-print-area");
    if (!element) throw new Error("Estimate area not found");

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;

    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > maxHeight) {
      const ratio = maxHeight / imgHeight;
      imgWidth *= ratio;
      imgHeight *= ratio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", x, y, imgWidth, imgHeight);
    pdf.autoPrint();

    const url = URL.createObjectURL(pdf.output("blob"));
    const w = window.open(url);
    if (!w) {
      pdf.save(`estimate-${estimateNumber || "estimate"}.pdf`);
    }
  } catch (err) {
    alert(`Failed to prepare print: ${err.message}`);
  }
}

export default function EstimateReportGeneration({ estimateData, onBack }) {
  const data = estimateData || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const currency = data.currency || "INR";
  const currencySymbol = getCurrencySymbol(currency);

  const subtotal =
    data.subtotal ?? items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discount = Number(data.discount) || 0;
  const discountAmount = (subtotal * discount) / 100;
  const total = data.total ?? subtotal - discountAmount;

  const termsLines = (data.terms || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const notesLines = (data.notes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const handleBack = () => {
    if (onBack) onBack();
  };

  const handlePrint = () => printEstimatePdf(data.estimateNumber);
  const handleDownload = () => generateEstimatePdf(data.estimateNumber);

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      <div
        className="mx-auto mb-4 flex justify-between items-center print-hidden"
        style={{ maxWidth: "820px", padding: "0 1rem" }}
      >
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleBack}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-700 hover:text-gray-900 transition-colors"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 select-none">Preview</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Print
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
          >
            Download
          </button>
        </div>
      </div>

      <div
        id="estimate-print-area"
        className="invoice-a4 mx-auto bg-white shadow-lg text-sm border-[1.4px] border-gray-400"
        style={{ padding: "1rem", maxWidth: "820px" }}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Logo" className="h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {data.companyName || "FessiT Solutions Private Limited"}
              </h1>
              <p className="text-xs text-gray-700 whitespace-pre-line">
                {data.companyAddress || ""}
              </p>
              {data.companyGstin && <p className="text-xs text-gray-700 mt-1">GSTIN: {data.companyGstin}</p>}
              {data.companyEmail && <p className="text-xs text-gray-700">Email: {data.companyEmail}</p>}
              {data.companyPhone && <p className="text-xs text-gray-700">Ph: {data.companyPhone}</p>}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-semibold text-black-300">ESTIMATE</h2>
            <p className="text-xs text-gray-500 mt-1">
              {data.estimateNumber || "-"}
            </p>
          </div>
        </div>

        <div className="-mx-4 mb-6 text-xs text-gray-800">
          <table className="w-full border-t border-b border-gray-400 border-collapse">
            <tbody>
              <tr>
                <td className="w-1/2 align-top border-r border-gray-400 px-4 py-2">
                  <p>
                    <span className="font-semibold">Estimate No.</span>
                    <span className="ml-2">: {data.estimateNumber || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Issue Date</span>
                    <span className="ml-2">: {data.issueDate || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Expiry Date</span>
                    <span className="ml-2">: {data.expiryDate || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Currency</span>
                    <span className="ml-2">: {currency}</span>
                  </p>
                </td>

                <td className="w-1/2 align-top px-4 py-2">
                  <p className="font-semibold mb-1">Customer</p>
                  <p className="text-sm font-medium text-gray-900">
                    {data.customerName || data.customerId || "-"}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="w-full border border-black border-collapse text-xs mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 px-2 py-1 text-center w-8">
                Sl
              </th>
              <th className="border border-gray-400 px-2 py-1 text-center">
                Item &amp; Description
              </th>
              <th className="border border-gray-400 px-2 py-1 text-center w-16">
                Qty
              </th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">
                Unit Price
              </th>
              {/* <th className="border border-gray-400 px-2 py-1 text-center w-16">
                Disc %
              </th> */}
              <th className="border border-gray-400 px-2 py-1 text-center w-16">
                Tax %
              </th>
              <th className="border border-gray-400 px-2 py-1 text-center w-24">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="border border-gray-400 px-2 py-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-gray-500">{item.description}</p>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {formatNumber(item.unitPrice || 0, currency)}
                  </td>
                  {/* <td className="border border-gray-400 px-2 py-1 text-center">
                    {item.discount ?? "-"}
                  </td> */}
                  <td className="border border-gray-400 px-2 py-1 text-center">
                    {item.taxRate ?? "-"}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-semibold">
                    {currencySymbol} {formatNumber(item.amount || 0, currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="border border-gray-400 px-2 py-4 text-center text-gray-500"
                >
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-xs text-gray-800 space-y-3">
            <div>
              <h3 className="font-semibold mb-1">{bankDetails.title}</h3>
              <div className="border border-gray-400 rounded p-2">
                {bankDetails.fields.map((field) => (
                  <p key={field.label}>
                    <span className="font-semibold">{field.label}:</span>{" "}
                    {field.value}
                  </p>
                ))}
              </div>
            </div>

            {termsLines.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Terms &amp; Conditions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {termsLines.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {notesLines.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Notes</h3>
                <ul className="list-disc list-inside space-y-1">
                  {notesLines.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-900">
            <div className="p-2 space-y-2 -mt-4">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">
                  {currencySymbol} {formatNumber(subtotal || 0, currency)}
                </span>
              </div>

              <div className="border-t border-gray-400 my-1" />

              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({discount}%)</span>
                  <span className="font-semibold">
                    - {currencySymbol} {formatNumber(discountAmount || 0, currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-400 pt-2 mt-2 text-sm">
                <span className="font-bold">Total</span>
                <span className="font-extrabold text-indigo-700">
                  {currencySymbol} {formatNumber(total || 0, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-700 mb-16">
              For {data.companyName || "FessiT Solutions Private Limited"}
            </p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-xs text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
