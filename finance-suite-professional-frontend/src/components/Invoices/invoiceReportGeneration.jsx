import React from "react";
import Logo from "../../assets/FessitLogoTrans.png";
import { bankDetails, terms } from "./SampleInvoiceData";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

function formatCurrency(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 👇 ONLY called when user clicks "Download" inside preview
async function generateInvoicePdf(invoiceNumber) {
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${invoiceNumber || "invoice"}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert(`Failed to generate PDF: ${err.message}`);
  }
}

export default function InvoiceReportGeneration({ invoiceData }) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    generateInvoicePdf(invoiceData?.invoice_number);
  };

  const data = {
    company_logo: Logo,
    ...invoiceData,
  };

  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      {/* Top bar – hidden when printing */}
      <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <h1 className="text-xl font-semibold text-gray-800">
          Invoice Preview
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      {/* Printable A4 area */}
      <div
        id="invoice-print-area"
        className="print-area invoice-a4 mx-auto bg-white shadow-md rounded-lg p-8 text-sm text-gray-800"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {data.company_logo && (
              <img
                src={data.company_logo}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {data.company_name || "Company Name"}
              </h2>
              <p className="whitespace-pre-line text-xs text-gray-600 mt-1">
                {data.company_address || "Company address"}
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-700 text-right">
            <p>
              <span className="font-semibold">GSTIN: </span>
              {data.gstIN || "-"}
            </p>
            <p>
              <span className="font-semibold">Email: </span>
              {data.company_email || "-"}
            </p>
            <p>
              <span className="font-semibold">Phone: </span>
              {data.company_phone || "-"}
            </p>
          </div>
        </div>

        {/* Bill / Ship / Invoice meta */}
        <div className="flex justify-between mb-6">
          <div className="text-xs">
            <h3 className="font-semibold text-gray-800 mb-1">Bill To:</h3>
            <p className="font-medium">{data.billcustomer_name || "-"}</p>
            <p className="whitespace-pre-line text-gray-700">
              {data.billcustomer_address || "-"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">GSTIN: </span>
              {data.billcustomer_gstin || "-"}
            </p>
          </div>

          <div className="text-xs">
            <h3 className="font-semibold text-gray-800 mb-1">Ship To:</h3>
            <p className="font-medium">{data.shipcustomer_name || "-"}</p>
            <p className="whitespace-pre-line text-gray-700">
              {data.shipcustomer_address || "-"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">GSTIN: </span>
              {data.shipcustomer_gstin || "-"}
            </p>
          </div>

          <div className="text-xs">
            <h3 className="font-semibold text-gray-800 mb-1">Invoice</h3>
            <p>
              <span className="font-semibold">Invoice No: </span>
              {data.invoice_number || "-"}
            </p>
            <p>
              <span className="font-semibold">Invoice Date: </span>
              {data.invoice_date || "-"}
            </p>
            <p>
              <span className="font-semibold">Due Date: </span>
              {data.invoice_dueDate || "-"}
            </p>
            <p>
              <span className="font-semibold">PO No: </span>
              {data.po_number || "-"}
            </p>
            <p>
              <span className="font-semibold">Place of Supply: </span>
              {data.place_of_supply || "-"}
            </p>
            <p>
              <span className="font-semibold">Terms: </span>
              {data.invoice_terms || "-"}
            </p>
          </div>
        </div>

        {/* Subject */}
        {data.subject && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">
              Subject
            </h3>
            <p className="text-xs text-gray-700">{data.subject}</p>
          </div>
        )}

        {/* Items table */}
        <div className="mt-4">
          <table className="w-full border border-gray-300 border-collapse text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Sl No
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Item & Description
                </th>
                <th className="border border-gray-300 px-2 py-1 text-right">
                  Hour
                </th>
                <th className="border border-gray-300 px-2 py-1 text-right">
                  Rate
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-2 py-1 text-center"
                >
                  CGST
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-2 py-1 text-center"
                >
                  SGST
                </th>
                <th className="border border-gray-300 px-2 py-1 text-right">
                  Amount
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1"></th>
                <th className="border border-gray-300 px-2 py-1 text-center">
                  %
                </th>
                <th className="border border-gray-300 px-2 py-1 text-right">
                  Amt
                </th>
                <th className="border border-gray-300 px-2 py-1 text-center">
                  %
                </th>
                <th className="border border-gray-300 px-2 py-1 text-right">
                  Amt
                </th>
                <th className="border border-gray-300 px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index} className="align-top">
                    <td className="border border-gray-300 px-2 py-1">
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {item.description || "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {item.hours || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {item?.cgst?.cgstPercent || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(item?.cgst?.cgstAmount)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {item?.sgst?.sgstPercent || ""}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(item?.sgst?.sgstAmount)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                      {formatCurrency(item.itemTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="border border-gray-300 px-2 py-4 text-center text-gray-500"
                  >
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-sm text-xs">
            <div className="flex justify-between py-1">
              <span className="font-semibold">Sub Total</span>
              <span>₹ {formatCurrency(data.subTotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Total CGST</span>
              <span>₹ {formatCurrency(data.totalcgst)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Total SGST</span>
              <span>₹ {formatCurrency(data.totalsgst)}</span>
            </div>
            <div className="border-t border-gray-400 mt-2 pt-2 flex justify-between text-sm font-bold">
              <span>Grand Total</span>
              <span className="text-indigo-700">
                ₹ {formatCurrency(data.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="mt-4 text-xs">
            <h3 className="font-semibold text-gray-800 mb-1">Notes</h3>
            <p className="text-gray-700 whitespace-pre-line">{data.notes}</p>
          </div>
        )}

        {/* Bank + Terms */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              {bankDetails.title}
            </h3>
            <div className="border border-gray-300 rounded">
              {bankDetails.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex justify-between border-b border-gray-200 last:border-b-0 px-3 py-1"
                >
                  <span className="font-semibold">{field.label}</span>
                  <span className="text-right ml-4">{field.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Terms &amp; Conditions
            </h3>
            <ul className="list-decimal list-inside space-y-1 text-gray-700">
              {terms.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end mt-10">
          <div className="text-center text-xs">
            <p className="mb-10 font-semibold">
              For {data.company_name || "FessiT Solutions Private Limited"}
            </p>
            <div className="border-t border-gray-400 pt-1">
              <p>Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
