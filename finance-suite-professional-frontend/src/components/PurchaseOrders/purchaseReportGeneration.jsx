import React from "react";
import Logo from "../../assets/FessitLogoTrans.png";
import { formatNumber } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

// 💰 Helper to get currency symbol
const getCurrencySymbol = (currencyType) => {
  if (!currencyType || currencyType === "" || currencyType === "INR") {
    return "₹";
  }
  
  const currencySymbols = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "CNY": "¥", "INR": "₹",
    "CAD": "C$", "AUD": "A$", "CHF": "CHF", "SEK": "kr", "NOK": "kr", "DKK": "kr",
    "RUB": "₽", "BRL": "R$", "MXN": "$", "SGD": "S$", "HKD": "HK$", "NZD": "NZ$",
    "KRW": "₩", "TRY": "₺", "ZAR": "R", "PLN": "zł", "CZK": "Kč", "HUF": "Ft",
    "ILS": "₪", "AED": "د.إ", "SAR": "﷼", "QAR": "﷼", "KWD": "د.ك", "BHD": ".د.ب",
    "OMR": "﷼", "EGP": "£", "THB": "฿", "MYR": "RM", "IDR": "Rp", "PHP": "₱",
    "VND": "₫", "TWD": "NT$", "BGN": "лв", "RON": "lei", "HRK": "kn", "RSD": "дин",
    "UAH": "₴", "BYN": "Br", "GEL": "₾", "AMD": "֏", "AZN": "₼", "KZT": "₸",
    "UZS": "лв", "PKR": "₨", "BDT": "৳", "LKR": "₨", "NPR": "₨", "AFN": "؋",
    "IRR": "﷼", "IQD": "ع.د", "JOD": "د.ا", "LBP": "£", "SYP": "£", "YER": "﷼",
    "MAD": "د.م.", "TND": "د.ت", "DZD": "د.ج", "LYD": "ل.د", "SDG": "ج.س.",
    "ETB": "Br", "KES": "KSh", "UGX": "USh", "TZS": "TSh", "RWF": "FRw", "GHS": "₵",
    "NGN": "₦", "XOF": "CFA", "XAF": "FCFA", "MZN": "MT", "BWP": "P", "SZL": "L",
    "LSL": "L", "NAD": "$", "ZMW": "ZK", "ZWL": "$", "MWK": "MK", "MGA": "Ar",
    "MUR": "₨", "SCR": "₨", "CLP": "$", "ARS": "$", "UYU": "$U", "PYG": "₲",
    "BOB": "Bs", "PEN": "S/", "COP": "$", "VES": "Bs", "GYD": "$", "SRD": "$",
    "TTD": "TT$", "JMD": "J$", "BBD": "Bds$", "BSD": "$", "BZD": "BZ$", "GTQ": "Q",
    "HNL": "L", "NIO": "C$", "CRC": "₡", "PAB": "B/.", "DOP": "RD$", "HTG": "G",
    "CUP": "₱", "XCD": "$", "AWG": "ƒ", "ANG": "ƒ", "FJD": "$", "PGK": "K",
    "SBD": "$", "VUV": "VT", "WST": "WS$", "TOP": "T$", "XPF": "₣"
  };
  
  return currencySymbols[currencyType] || "₹";
};

async function generatePOPdf(poNumber) {
  try {
    const element = document.getElementById("po-print-area");
    if (!element) throw new Error("PO area not found");

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
    pdf.save(`PO-${poNumber || "purchase-order"}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert(`Failed to generate PDF: ${err.message}`);
  }
}

async function printPOPdf(poNumber) {
  try {
    const element = document.getElementById("po-print-area");
    if (!element) throw new Error("PO area not found");

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
      pdf.save(`PO-${poNumber || "purchase-order"}.pdf`);
    }
  } catch (err) {
    console.error("PDF print generation failed:", err);
    alert(`Failed to prepare print: ${err.message}`);
  }
}

const PurchaseOrderReportGeneration = ({ poData, onBack }) => {
  const handleBack = () => {
    if (onBack) onBack();
  };

  const data = {
    company_logo: Logo,
    ...poData,
  };

  const items = Array.isArray(data.items) ? data.items : [];

  const computedSubTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.itemTotal) || 0),
    0
  ) || 0;

  const subTotal = data.subTotal || computedSubTotal.toFixed(2);
  const total = data.total || computedSubTotal.toFixed(2);

  const handlePrint = () => printPOPdf(data.po_number);
  const handleDownload = () => generatePOPdf(data.po_number);

  const notesLines = (data.notes || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white">
      <div className="mx-auto mb-4 flex justify-between items-center print-hidden" style={{ maxWidth: "820px", padding: "0 1rem" }}>
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
          >
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
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
        id="po-print-area"
        className="mx-auto bg-white shadow-lg text-sm border-[1.4px] border-gray-400"
        style={{ 
          padding: "1rem", 
          width: "210mm", 
          minHeight: "297mm",
          maxWidth: "210mm"
        }}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {data.company_logo && (
              <img src={data.company_logo} alt="Company Logo" className="h-12 object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{data.company_name}</h1>
              <p className="text-xs text-gray-700 whitespace-pre-line">{data.company_address}</p>
              <p className="text-xs text-gray-700 mt-1">GSTIN: {data.gstIN}</p>
              <p className="text-xs text-gray-700">
                Email: {data.company_email} | Ph: {data.company_phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-semibold text-black-300">PURCHASE ORDER</h2>
          </div>
        </div>

        <div className="-mx-4 mb-6 text-xs text-gray-800">
          <table className="w-full border-t border-b border-gray-400 border-collapse">
            <tbody>
              <tr>
                

                <td className="w-1/2 align-top px-4 py-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-1">Vendor Details</h3>
                  <p className="text-sm font-medium text-gray-900">{data.vendor_name}</p>
                  <p className="text-xs text-gray-700 whitespace-pre-line">{data.vendor_address}</p>
                  {data.vendor_gstin && (
                    <p className="text-xs text-gray-700 mt-1">GSTIN: {data.vendor_gstin}</p>
                  )}
                  {data.vendor_phone && (
                    <p className="text-xs text-gray-700">Ph: {data.vendor_phone}</p>
                  )}
                  {data.vendor_email && (
                    <p className="text-xs text-gray-700">Email: {data.vendor_email}</p>
                  )}
                </td>

                <td className="w-1/2 align-top border-l border-gray-400 px-4 py-2">
                  <p>
                    <span className="font-semibold">PO No.</span>
                    <span className="ml-2">: {data.po_number || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">PO Date</span>
                    <span className="ml-2">: {data.po_date || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Due Date</span>
                    <span className="ml-2">: {data.po_dueDate || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Terms</span>
                    <span className="ml-2">: {data.po_terms || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Place of Supply</span>
                    <span className="ml-2">: {data.place_of_supply || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Currency</span>
                    <span className="ml-2">: {data.currency_type || "INR"} ({getCurrencySymbol(data.currency_type)})</span>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {data.subject && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-800 mb-1">Subject</p>
            <p className="text-xs text-gray-800">{data.subject}</p>
          </div>
        )}

        <table className="w-full border border-black border-collapse text-xs mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 px-2 py-1 text-center w-8">Sl</th>
              <th className="border border-gray-400 px-2 py-1 text-center">Description</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-20">Quantity</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-28">Rate</th>
              <th className="border border-gray-400 px-2 py-1 text-center w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="align-top">
                  <td className="border border-gray-400 px-2 py-1 text-center">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">{item.description}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{item.quantity}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right whitespace-nowrap">
                    {getCurrencySymbol(data.currency_type)} {formatNumber(item.rate || 0)}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-semibold whitespace-nowrap">
                    {getCurrencySymbol(data.currency_type)} {formatNumber(item.itemTotal || 0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="border border-gray-400 px-2 py-4 text-center text-gray-500"
                >
                  No items added
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-xs text-gray-800 space-y-3">
            {notesLines.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Notes</h3>
                <ul className="list-disc list-inside space-y-1">
                  {notesLines.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-900">
            <div className="p-2 space-y-2 -mt-4">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">{getCurrencySymbol(data.currency_type)} {formatNumber(subTotal || 0)}</span>
              </div>

              {/* <div className="border-t border-gray-400 my-1"></div> */}

              <div className="flex justify-between border-t border-gray-400 pt-2 mt-2 text-sm">
                <span className="font-bold">Grand Total</span>
                <span className="font-extrabold text-indigo-700">
                  {getCurrencySymbol(data.currency_type)} {formatNumber(total || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

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

export default PurchaseOrderReportGeneration;
