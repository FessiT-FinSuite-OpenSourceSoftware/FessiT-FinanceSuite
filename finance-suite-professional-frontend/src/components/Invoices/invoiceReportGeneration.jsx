import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { sampleData } from "./sampleInvoiceData";
import { formatNumber, getCurrencySymbol } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/** 🔽 High-quality A4 PDF from the invoice-print-area (Download) */
async function generateInvoicePdf(invoiceNumber) {
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");

    const canvas = await html2canvas(element, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg");

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

    pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
    pdf.save(`invoice-${invoiceNumber || "invoice"}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert(`Failed to generate PDF: ${err.message}`);
  }
}

/** 🔽 Same capture, but opens PDF in print dialog instead of saving */
async function printInvoicePdf(invoiceNumber) {
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg");

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
      imgWidth = imgWidth * ratio;
      imgHeight = imgHeight * ratio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
    pdf.autoPrint();

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url);
    if (!printWindow) {
      // Popup blocked – fallback to download
      pdf.save(`invoice-${invoiceNumber || "invoice"}.pdf`);
    }
  } catch (err) {
    console.error("PDF print generation failed:", err);
    alert(`Failed to prepare print: ${err.message}`);
  }
}

const InvoiceReportGeneration = ({ invoiceData, orgData, onBack }) => {
  const handleBack = () => {
    if (onBack) onBack();
  };

  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    if (orgData?.logo) {
      axiosInstance
        .get(`/organisation-logo/${orgData.logo}`, { responseType: "blob" })
        .then((res) => {
          objectUrl = URL.createObjectURL(res.data);
          setLogoUrl(objectUrl);
        })
        .catch(() => setLogoUrl(null));
    } else {
      setLogoUrl(null);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [orgData?.logo]);

  // 🧠 Prefer actual invoiceData, fall back to sampleData
  const baseData =
    invoiceData && Object.keys(invoiceData || {}).length > 0
      ? invoiceData
      : sampleData;

  const data = {
    company_logo: logoUrl,
    ...baseData,
  };

  const items = Array.isArray(data.items) ? data.items : [];

  const invoiceType = data.invoice_type || "domestic";
  const isDomestic = invoiceType === "domestic";
  const isInternational = invoiceType === "international";

  // 🔹 Group CGST / SGST / IGST by percentage slabs (UPDATED to include 0%)
  const groupTaxValues = (itemsArr = []) => {
    const grouped = { cgst: {}, sgst: {}, igst: {} };

    itemsArr.forEach((item) => {
      const hours = parseFloat(item.hours || 0);
      const rate = parseFloat(item.rate || 0);
      const baseAmount = hours * rate;

      const cgstPercent = parseFloat(item?.cgst?.cgstPercent || 0);
      const sgstPercent = parseFloat(item?.sgst?.sgstPercent || 0);
      const igstPercent = parseFloat(item?.igst?.igstPercent || 0);

      // UPDATED: Removed > 0 check for domestic taxes
      if (isDomestic) {
        const cgstValue = (baseAmount * cgstPercent) / 100;
        grouped.cgst[cgstPercent] =
          (grouped.cgst[cgstPercent] || 0) + cgstValue;

        const sgstValue = (baseAmount * sgstPercent) / 100;
        grouped.sgst[sgstPercent] =
          (grouped.sgst[sgstPercent] || 0) + sgstValue;
      }

      // UPDATED: Removed > 0 check for international IGST
      if (isInternational) {
        const igstValue = (baseAmount * igstPercent) / 100;
        grouped.igst[igstPercent] =
          (grouped.igst[igstPercent] || 0) + igstValue;
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
  const totaligst = data.totaligst || "0.00";
  const total =
    data.total ||
    (
      computedSubTotal +
      parseFloat(totalcgst || 0) +
      parseFloat(totalsgst || 0) +
      parseFloat(totaligst || 0)
    ).toFixed(2);

  const handlePrint = () => printInvoicePdf(data.invoice_number);
  const handleDownload = () => generateInvoicePdf(data.invoice_number);

  // 🔗 Terms & Conditions:
  // Priority: invoice notes → org footerNote → org paymentInstructions → static fallback
  const customTermsLines = (data.notes || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const orgTermsLines = [
    ...(orgData?.footerNote || "").split("\n").map((l) => l.trim()).filter(Boolean),
    ...(orgData?.paymentInstructions || "").split("\n").map((l) => l.trim()).filter(Boolean),
  ];

  const termsToRender =
    customTermsLines.length > 0 ? customTermsLines :
    orgTermsLines.length > 0    ? orgTermsLines :
    [];

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      {/* Top bar – hidden in print, aligned with invoice width */}
      <div className="mx-auto mb-4 flex justify-between items-center print-hidden" style={{ maxWidth: "820px", padding: "0 1rem" }}>
        {/* Back + Preview title */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleBack}
        >
          {/* Lucide-style arrow left icon */}
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
            className="lucide lucide-arrow-left text-gray-700 hover:text-gray-900 transition-colors"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 select-none">
            Preview
          </h1>
        </div>

        {/* Print / Download buttons */}
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

      {/* ✅ A4-fitted printable area with outer border */}
      <div
        id="invoice-print-area"
        className="invoice-a4 mx-auto bg-white shadow-lg text-sm border-[1.4px] border-gray-400"
        style={{ padding: "1rem", maxWidth: "820px" }}
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
                Email: {data.company_email} | Ph: +91 {data.company_phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-semibold text-black-300">
              TAX INVOICE
            </h2>
            {/* <div className="mt-2 inline-flex px-3 py-1 rounded-full text-xs font-semibold border border-gray-400">
              {isDomestic ? "₹ Domestic" : "🌍 International"}
            </div> */}
          </div>
        </div>

        {/* 🔹 Combined Invoice / PO / Bill To / Ship To table */}
        <div className="-mx-4 mb-6 text-xs text-gray-800">
          <table className="w-full border-t border-b border-gray-400 border-collapse">
            <tbody>
              {/* Row 1: Invoice & PO details */}
              <tr>
                {/* LEFT COLUMN – Invoice side */}
                <td className="w-1/2 align-top border-r border-gray-400 px-4 py-2">
                  {data.invoice_number && <p><span className="font-semibold">Invoice No.</span><span className="ml-2">: {data.invoice_number}</span></p>}
                  {data.invoice_date && <p><span className="font-semibold">Invoice Date</span><span className="ml-2">: {data.invoice_date}</span></p>}
                  {data.invoice_terms && <p><span className="font-semibold">Terms</span><span className="ml-2">: {data.invoice_terms}</span></p>}
                  {data.invoice_dueDate && <p><span className="font-semibold">Due Date</span><span className="ml-2">: {data.invoice_dueDate}</span></p>}
                  {data.place_of_supply && <p><span className="font-semibold">Place of Supply</span><span className="ml-2">: {data.place_of_supply}</span></p>}
                </td>

                {/* RIGHT COLUMN – P.O. side */}
                <td className="w-1/2 align-top px-4 py-2">
                  {data.po_number && <p><span className="font-semibold">P O Number</span><span className="ml-2">: {data.po_number}</span></p>}
                  {data.po_date && <p><span className="font-semibold">P O Date</span><span className="ml-2">: {data.po_date}</span></p>}
                  {isInternational && (
                    <>
                      {(data.lut_no || data.lutNo) && <p><span className="font-semibold">LUT No</span><span className="ml-2">: {data.lut_no || data.lutNo}</span></p>}
                      {(data.iec_no || data.iecNo) && <p><span className="font-semibold">IEC No</span><span className="ml-2">: {data.iec_no || data.iecNo}</span></p>}
                    </>
                  )}
                </td>
              </tr>

              {/* Row 2: Bill To / Ship To */}
              <tr>
                {/* Bill To */}
                <td className="w-1/2 align-top border-r border-t border-gray-400 px-4 py-3">
                  <h3 className="text-xs font-semibold text-gray-800 mb-1">
                    Bill To
                  </h3>
                  <p className="text-sm font-medium text-gray-900">
                    {data.billcustomer_name}
                  </p>
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    {data.billcustomer_address}
                  </p>
                  {isDomestic && (
                    <p className="text-xs text-gray-700 mt-1">
                      GSTIN: {data.billcustomer_gstin}
                    </p>
                  )}
                </td>

                {/* Ship To */}
                <td className="w-1/2 align-top border-t border-gray-400 px-4 py-3">
                  <h3 className="text-xs font-semibold text-gray-800 mb-1">
                    Ship To
                  </h3>
                  <p className="text-sm font-medium text-gray-900">
                    {data.shipcustomer_name}
                  </p>
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    {data.shipcustomer_address}
                  </p>
                  {isDomestic && (
                    <p className="text-xs text-gray-700 mt-1">
                      {/* GSTIN: {data.shipcustomer_gstin} */}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
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
                Items
              </th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">
                Rate
              </th>

              {isDomestic ? (
                <>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">
                    CGST %
                  </th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">
                    CGST Amt
                  </th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">
                    SGST %
                  </th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">
                    SGST Amt
                  </th>
                </>
              ) : (
                <>
                  <th className="border border-gray-400 px-2 py-1 text-center w-16">
                    IGST %
                  </th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">
                    IGST Amt
                  </th>
                </>
              )}

              <th className="border border-gray-400 px-2 py-1 text-center w-24">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="align-top">
                  <td className="border border-gray-400 px-2 py-1 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {item.description}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {item.hours}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {formatNumber(item.rate || 0, data.currency_type)}
                  </td>

                  {isDomestic ? (
                    <>
                      <td className="border border-gray-400 px-2 py-1 text-center">
                        {item?.cgst?.cgstPercent || "0"}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {formatNumber(item?.cgst?.cgstAmount || 0, data.currency_type)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center">
                        {item?.sgst?.sgstPercent || "0"}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {formatNumber(item?.sgst?.sgstAmount || 0, data.currency_type)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-400 px-2 py-1 text-center">
                        {item?.igst?.igstPercent || "0"}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {formatNumber(item?.igst?.igstAmount || 0, data.currency_type)}
                      </td>
                    </>
                  )}

                  <td className="border border-gray-400 px-2 py-1 text-right font-semibold">
                    {formatNumber(item.itemTotal || 0, data.currency_type)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isDomestic ? 9 : 7}
                  className="border border-gray-400 px-2 py-4 text-center text-gray-500"
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
            {(() => {
              const requiredFields = [orgData?.accountHolder, orgData?.accountNumber, orgData?.bankName, orgData?.ifscCode];
              const internationalFields = isInternational ? [orgData?.accountType, orgData?.bankBranch, orgData?.swiftCode] : [];
              const domesticFields = isDomestic ? [orgData?.upiId] : [];
              
              const allRequiredFields = [...requiredFields, ...internationalFields, ...domesticFields];
              const hasAllRequiredFields = allRequiredFields.every(field => field && field.trim() !== '');
              
              return hasAllRequiredFields ? (
                <div>
                  <h3 className="font-semibold mb-1">Bank Details</h3>
                  <div className="border border-gray-400 rounded p-2">
                    {orgData?.accountHolder && <p><span className="font-semibold">Account Name:</span> {orgData.accountHolder}</p>}
                    {orgData?.accountNumber && <p><span className="font-semibold">Account Number:</span> {orgData.accountNumber}</p>}
                    {orgData?.accountType && <p><span className="font-semibold">Account Type:</span> {orgData.accountType}</p>}
                    {orgData?.ifscCode && <p><span className="font-semibold">IFSC Code:</span> {orgData.ifscCode}</p>}
                    {orgData?.bankName && <p><span className="font-semibold">Bank Name:</span> {orgData.bankName}</p>}
                    {orgData?.bankBranch && <p><span className="font-semibold">Branch:</span> {orgData.bankBranch}</p>}
                    {isInternational && orgData?.swiftCode && <p><span className="font-semibold">Swift Code:</span> {orgData.swiftCode}</p>}
                    {isDomestic && orgData?.upiId && <p><span className="font-semibold">UPI ID:</span> {orgData.upiId}</p>}
                  </div>
                </div>
              ) : null;
            })()}

            {termsToRender.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Terms &amp; Conditions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {termsToRender.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="text-xs text-gray-900">
            <div className="p-2 space-y-2 -mt-4">
              {/* Subtotal */}
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">
                  {getCurrencySymbol(data.currency_type)} {formatNumber(subTotal || 0, data.currency_type)}
                </span>
              </div>

              {/* Separator below subtotal */}
              <div className="border-t border-gray-400 my-1"></div>

              {(() => {
                // Collect all distinct percentage slabs (UPDATED: including 0%)
                const percentsSet = new Set();

                if (isDomestic) {
                  Object.keys(groupedTaxes.cgst || {}).forEach((p) =>
                    percentsSet.add(p)
                  );
                  Object.keys(groupedTaxes.sgst || {}).forEach((p) =>
                    percentsSet.add(p)
                  );
                } else if (isInternational) {
                  Object.keys(groupedTaxes.igst || {}).forEach((p) =>
                    percentsSet.add(p)
                  );
                }

                // UPDATED: Removed the filter p > 0 to include 0% tax
                const allPercents = Array.from(percentsSet)
                  .map((p) => parseFloat(p))
                  .filter((p) => !Number.isNaN(p))
                  .sort((a, b) => a - b);

                return (
                  <>
                    {allPercents.map((percent, index) => {
                      const key = String(percent);

                      const cgstAmount = groupedTaxes.cgst?.[key] || 0;
                      const sgstAmount = groupedTaxes.sgst?.[key] || 0;
                      const igstAmount = groupedTaxes.igst?.[key] || 0;

                      const lines = [];

                      if (isDomestic) {
                        // UPDATED: Show CGST/SGST even if 0
                        if (cgstAmount !== undefined) {
                          lines.push({
                            label: `CGST (${percent}%)`,
                            value: cgstAmount,
                          });
                        }
                        if (sgstAmount !== undefined) {
                          lines.push({
                            label: `SGST (${percent}%)`,
                            value: sgstAmount,
                          });
                        }
                      } else if (isInternational) {
                        // UPDATED: Show IGST even if 0
                        if (igstAmount !== undefined) {
                          lines.push({
                            label: `IGST (${percent}%)`,
                            value: igstAmount,
                          });
                        }
                      }

                      if (!lines.length) return null;

                      return (
                        <React.Fragment key={percent}>
                          {index > 0 && (
                            <div className="border-t border-gray-200 my-1"></div>
                          )}
                          {lines.map((l) => (
                            <div
                              className="flex justify-between"
                              key={l.label}
                            >
                              <span>{l.label}</span>
                              <span className="font-semibold">
                                {getCurrencySymbol(data.currency_type)} {formatNumber(l.value, data.currency_type)}
                              </span>
                            </div>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}

              {/* Grand Total */}
              <div className="flex justify-between border-t border-gray-400 pt-2 mt-2 text-sm">
                <span className="font-bold">Grand Total/Balance Due</span>
                <span className="font-extrabold text-indigo-700">
                  {getCurrencySymbol(data.currency_type)} {formatNumber(total || 0, data.currency_type)}
                </span>
              </div>
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
