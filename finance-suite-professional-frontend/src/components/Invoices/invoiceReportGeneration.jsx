import React from "react";
import Logo from "../../assets/FessitLogoTrans.png";
import { sampleData, bankDetails, terms } from "./SampleInvoiceData";
import { formatNumber } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/** 🔽 High-quality A4 PDF from the invoice-print-area */
async function generateInvoicePdf(invoiceNumber) {
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 5; // mm
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > maxHeight) {
      const ratio = maxHeight / imgHeight;
      imgWidth = imgWidth * ratio;
      imgHeight = imgHeight * ratio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`invoice-${invoiceNumber || "invoice"}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert(`Failed to generate PDF: ${err.message}`);
  }
}

const InvoiceReportGeneration = ({ invoiceData }) => {
  // 🧠 Prefer actual invoiceData, fall back to sampleData
  const baseData =
    invoiceData && Object.keys(invoiceData || {}).length > 0
      ? invoiceData
      : sampleData;

  // Always ensure we have a logo
  const data = {
    company_logo: Logo,
    ...baseData,
  };

  const items = Array.isArray(data.items) ? data.items : [];

  // 🔹 Group CGST / SGST by percentage slabs
  const groupTaxValues = (itemsArr = []) => {
    const grouped = { cgst: {}, sgst: {} };

    itemsArr.forEach((item) => {
      const hours = parseFloat(item.hours || 0);
      const rate = parseFloat(item.rate || 0);
      const baseAmount = hours * rate;

      const cgstPercent = parseFloat(item?.cgst?.cgstPercent || 0);
      const sgstPercent = parseFloat(item?.sgst?.sgstPercent || 0);

      if (cgstPercent > 0) {
        const cgstValue = (baseAmount * cgstPercent) / 100;
        grouped.cgst[cgstPercent] =
          (grouped.cgst[cgstPercent] || 0) + cgstValue;
      }

      if (sgstPercent > 0) {
        const sgstValue = (baseAmount * sgstPercent) / 100;
        grouped.sgst[sgstPercent] =
          (grouped.sgst[sgstPercent] || 0) + sgstValue;
      }
    });

    return grouped;
  };

  const groupedTaxes = groupTaxValues(items);

  // If totals are not present for some reason, derive simple subtotal
  const computedSubTotal =
    items.reduce(
      (sum, item) => sum + (parseFloat(item.itemTotal) || 0),
      0
    ) || 0;

  const subTotal = data.subTotal || computedSubTotal.toFixed(2);
  const totalcgst = data.totalcgst || "0.00";
  const totalsgst = data.totalsgst || "0.00";
  const total =
    data.total ||
    (
      computedSubTotal +
      parseFloat(totalcgst || 0) +
      parseFloat(totalsgst || 0)
    ).toFixed(2);

  const handlePrint = () => window.print();
  const handleDownload = () => generateInvoicePdf(data.invoice_number);

  // 🔗 Terms & Conditions: from notes if present, else static terms
  const customTermsLines = (data.notes || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const termsToRender =
    customTermsLines.length > 0 ? customTermsLines : terms;

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      {/* Top bar – hidden in print */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center print-hidden">
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

      {/* ✅ A4-fitted printable area */}
      <div
        id="invoice-print-area"
        className="invoice-a4 mx-auto bg-white shadow-lg p-8 text-sm"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {data.company_logo && (
              <img
                src={data.company_logo}
                alt="Company Logo"
                className="h-12 object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {data.company_name}
              </h1>
              <p className="text-xs text-gray-700 whitespace-pre-line">
                {data.company_address}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                GSTIN: {data.gstIN}
              </p>
              <p className="text-xs text-gray-700">
                Email: {data.company_email} | Ph: {data.company_phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-lg font-semibold text-gray-900">
              TAX INVOICE
            </h2>
          </div>
        </div>

        {/* Bill / Ship To */}
        <div className="border-t border-b border-gray-300 py-3 mb-4 text-xs text-gray-800">
          <div className="grid grid-cols-2 gap-4">
            {/* LEFT COLUMN */}
            <div className="space-y-1">
              <p>
                <span className="font-semibold">Invoice No.</span>
                <span className="ml-2">: {data.invoice_number || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">Invoice Date</span>
                <span className="ml-2">: {data.invoice_date || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">Terms</span>
                <span className="ml-2">: {data.invoice_terms || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">Due Date</span>
                <span className="ml-2">: {data.invoice_dueDate || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">Place of Supply</span>
                <span className="ml-2">: {data.place_of_supply || "-"}</span>
              </p>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-1">
              <p>
                <span className="font-semibold">P O Number</span>
                <span className="ml-2">: {data.po_number || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">P O Date</span>
                <span className="ml-2">: {data.po_date || "-"}</span>
              </p>
              <p>
                <span className="font-semibold">LUT No</span>
                <span className="ml-2">
                  : {data.lut_no || data.lutNo || "-"}
                </span>
              </p>
              <p>
                <span className="font-semibold">IEC No</span>
                <span className="ml-2">
                  : {data.iec_no || data.iecNo || "-"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill / Ship To (now comes AFTER meta block) */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-4 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-800 mb-1">
              Bill To
            </h3>
            <p className="text-sm font-medium text-gray-900">
              {data.billcustomer_name}
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-line">
              {data.billcustomer_address}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              GSTIN: {data.billcustomer_gstin}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-800 mb-1">
              Ship To
            </h3>
            <p className="text-sm font-medium text-gray-900">
              {data.shipcustomer_name}
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-line">
              {data.shipcustomer_address}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              GSTIN: {data.shipcustomer_gstin}
            </p>
          </div>
        </div>

        {/* Subject */}
        {data.subject && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-800 mb-1">
              Subject
            </p>
            <p className="text-xs text-gray-800">{data.subject}</p>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border border-gray-300 border-collapse text-xs mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-1 text-left w-8">
                Sl
              </th>
              <th className="border border-gray-300 px-2 py-1 text-left">
                Item & Description
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right w-16">
                Hour
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right w-20">
                Rate
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center w-16">
                CGST %
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right w-20">
                CGST Amt
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center w-16">
                SGST %
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right w-20">
                SGST Amt
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right w-24">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="align-top">
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {item.description}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.hours}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {formatNumber(item.rate || 0)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {item?.cgst?.cgstPercent || "0"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {formatNumber(item?.cgst?.cgstAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {item?.sgst?.sgstPercent || "0"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {formatNumber(item?.sgst?.sgstAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                    {formatNumber(item.itemTotal || 0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="border border-gray-300 px-2 py-4 text-center text-gray-500"
                >
                  No items added
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals + Bank Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Bank Details & Terms */}
          <div className="text-xs text-gray-800 space-y-3">
            <div>
              <h3 className="font-semibold mb-1">{bankDetails.title}</h3>
              <div className="border border-gray-300 rounded p-2">
                {bankDetails.fields.map((field) => (
                  <p key={field.label}>
                    <span className="font-semibold">{field.label}:</span>{" "}
                    {field.value}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Terms &amp; Conditions</h3>
              <ul className="list-disc list-inside space-y-1">
                {termsToRender.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-xs text-gray-900">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span>Sub Total</span>
              <span className="font-semibold">
                ₹ {formatNumber(subTotal || 0)}
              </span>
            </div>

            {(() => {
              // Collect all distinct percentage slabs from CGST + SGST
              const allPercents = Array.from(
                new Set([
                  ...Object.keys(groupedTaxes.cgst || {}),
                  ...Object.keys(groupedTaxes.sgst || {}),
                ])
              )
                .map((p) => parseFloat(p))
                .filter((p) => !Number.isNaN(p) && p > 0)
                .sort((a, b) => a - b);

              return allPercents.map((percent) => {
                const key = String(percent);
                const cgstAmount = groupedTaxes.cgst?.[key] || 0;
                const sgstAmount = groupedTaxes.sgst?.[key] || 0;

                return (
                  <React.Fragment key={percent}>
                    {cgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>{`CGST (${percent}%)`}</span>
                        <span className="font-semibold">
                          ₹ {formatNumber(cgstAmount || 0)}
                        </span>
                      </div>
                    )}

                    {sgstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>{`SGST (${percent}%)`}</span>
                        <span className="font-semibold">
                          ₹ {formatNumber(sgstAmount || 0)}
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}

            {/* Grand Total */}
            <div className="flex justify-between border-t border-gray-400 pt-2 mt-1 text-sm">
              <span className="font-bold">Grand Total</span>
              <span className="font-extrabold text-indigo-700">
                ₹ {formatNumber(total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end mt-8">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-700 mb-16">
              For {data.company_name}
            </p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-xs text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportGeneration;
