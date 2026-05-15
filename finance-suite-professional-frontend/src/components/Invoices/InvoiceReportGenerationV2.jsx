import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { sampleData } from "./sampleInvoiceData";
import { formatNumber, getCurrencySymbol } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toast } from "react-toastify";
import { isTauri, savePdf, showDownloadNotification } from "../../utils/pdfUtils";
import fallbackLogo from "../../assets/FessiTLogoTrans.png";

async function generateInvoicePdf(invoiceNumber) {
  const toastId = toast.loading("Generating PDF...");
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");
    const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: "#ffffff", logging: false });
    const imgData = canvas.toDataURL("image/jpeg");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > maxHeight) { const r = maxHeight / imgHeight; imgWidth *= r; imgHeight *= r; }
    pdf.addImage(imgData, "JPEG", (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
    const fileName = `invoice-${invoiceNumber || "invoice"}.pdf`;
    const filePath = await savePdf(pdf, fileName);
    toast.dismiss(toastId);
    await showDownloadNotification(fileName, filePath);
  } catch (err) {
    toast.update(toastId, { render: `Failed to generate PDF: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
  }
}

async function printInvoicePdf(invoiceNumber) {
  const toastId = toast.loading("Preparing print...");
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");
    const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false });
    const imgData = canvas.toDataURL("image/jpeg");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > maxHeight) { const r = maxHeight / imgHeight; imgWidth *= r; imgHeight *= r; }
    pdf.addImage(imgData, "JPEG", (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
    pdf.autoPrint();
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (!printWindow) {
      const fileName = `invoice-${invoiceNumber || "invoice"}.pdf`;
      const filePath = await savePdf(pdf, fileName);
      toast.dismiss(toastId);
      await showDownloadNotification(fileName, filePath);
    } else {
      toast.update(toastId, { render: "Print dialog opened", type: "success", isLoading: false, autoClose: 2000 });
    }
  } catch (err) {
    toast.update(toastId, { render: `Failed to prepare print: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
  }
}

const InvoiceReportGenerationV2 = ({ invoiceData, orgData, onBack }) => {
  const baseData = invoiceData && Object.keys(invoiceData || {}).length > 0 ? invoiceData : sampleData;

  const [logoUrl, setLogoUrl] = useState(fallbackLogo);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    const fetchLogo = async () => {
      const logoFilename = baseData?.linkedLogo || "";
      if (!logoFilename) { setLogoLoading(false); return; }
      try {
        const res = await axiosInstance.get(`/organisation-logo/${logoFilename}`, { responseType: "blob" });
        if (!cancelled) { objectUrl = URL.createObjectURL(res.data); setLogoUrl(objectUrl); }
      } catch { if (!cancelled) setLogoUrl(fallbackLogo); }
      finally { if (!cancelled) setLogoLoading(false); }
    };
    setLogoLoading(true);
    fetchLogo();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [baseData?.linkedLogo]);

  if (logoLoading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-gray-500 text-sm">Loading invoice...</div>
    </div>
  );

  const data = { company_logo: logoUrl, ...baseData };
  const items = Array.isArray(data.items) ? data.items : [];
  const isDomestic = (data.invoice_type || "domestic") === "domestic";
  const isInternational = data.invoice_type === "international";

  const groupTaxValues = (itemsArr = []) => {
    const grouped = { cgst: {}, sgst: {}, igst: {} };
    itemsArr.forEach((item) => {
      const base = (parseFloat(item.hours || 0)) * (parseFloat(item.rate || 0));
      if (isDomestic) {
        const cp = parseFloat(item?.cgst?.cgstPercent || 0);
        const sp = parseFloat(item?.sgst?.sgstPercent || 0);
        grouped.cgst[cp] = (grouped.cgst[cp] || 0) + (base * cp) / 100;
        grouped.sgst[sp] = (grouped.sgst[sp] || 0) + (base * sp) / 100;
      }
      if (isInternational) {
        const ip = parseFloat(item?.igst?.igstPercent || 0);
        grouped.igst[ip] = (grouped.igst[ip] || 0) + (base * ip) / 100;
      }
    });
    return grouped;
  };

  const groupedTaxes = groupTaxValues(items);
  const computedSubTotal = items.reduce((s, i) => s + (parseFloat(i.itemTotal) || 0), 0);
  const subTotal = data.subTotal || computedSubTotal.toFixed(2);
  const totalcgst = data.totalcgst || "0.00";
  const totalsgst = data.totalsgst || "0.00";
  const totaligst = data.totaligst || "0.00";
  const total = data.total || (computedSubTotal + parseFloat(totalcgst) + parseFloat(totalsgst) + parseFloat(totaligst)).toFixed(2);

  const currSym = getCurrencySymbol(data.currency_type);

  const customTermsLines = (data.notes || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const orgTermsLines = (orgData?.paymentInstructions || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const termsToRender = customTermsLines.length > 0 ? customTermsLines : orgTermsLines;
  const footerNoteLines = (orgData?.footerNote || "").split("\n").map((l) => l.trim()).filter(Boolean);

  const allPercents = (() => {
    const s = new Set();
    if (isDomestic) { Object.keys(groupedTaxes.cgst).forEach((p) => s.add(p)); Object.keys(groupedTaxes.sgst).forEach((p) => s.add(p)); }
    else Object.keys(groupedTaxes.igst).forEach((p) => s.add(p));
    return Array.from(s).map(parseFloat).filter((p) => !isNaN(p)).sort((a, b) => a - b);
  })();

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      {/* Top bar */}
      <div className="mx-auto mb-4 flex justify-between items-center print-hidden" style={{ maxWidth: "820px", padding: "0 1rem" }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 hover:text-gray-900">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-800 select-none">Preview</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => printInvoicePdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">Print</button>
          <button onClick={() => generateInvoicePdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer">Download</button>
        </div>
      </div>

      {/* A4 area */}
      <div id="invoice-print-area" className="invoice-a4 mx-auto flex flex-col bg-white shadow-lg text-sm" style={{ maxWidth: "820px" }}>

        {/* Indigo accent top bar */}
        <div className="h-1 bg-indigo-600 rounded-t" />

        <div className="p-6 flex flex-col flex-1">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              {data.company_logo && <img src={data.company_logo} alt="Logo" className="h-12 object-contain" />}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{data.company_name}</h1>
                <p className="text-xs text-gray-500 whitespace-pre-line">{data.company_address}</p>
                <p className="text-xs text-gray-500">GSTIN: {data.gstIN}</p>
                <p className="text-xs text-gray-500">Email: {data.company_email} | Ph: +91 {data.company_phone}</p>
              </div>
            </div>
            <div className="text-right">
              <div
                style={{
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "18px",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  TAX INVOICE
                </span>
              </div>
              {/* <p className="text-xs text-gray-400 mt-1">{isDomestic ? "Domestic" : "International"}</p> */}
            </div>
          </div>

          {/* Invoice meta + Bill/Ship cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Invoice details */}
            <div className="bg-indigo-50 rounded-xl p-4 text-xs text-gray-700 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Invoice Details</p>
              {[
                ["Invoice No.", data.invoice_number],
                ["Invoice Date", data.invoice_date],
                ["Due Date", data.invoice_dueDate],
                ["Terms", data.invoice_terms],
                ["Place of Supply", data.place_of_supply],
                ["P.O. Number", data.po_number],
                ["P.O. Date", data.po_date],
                ...(isInternational ? [["LUT No", data.lut_no || data.lutNo], ["IEC No", data.iec_no || data.iecNo]] : []),
              ].map(([label, value]) => value ? (
                <div key={label} className="flex gap-1">
                  <span className="font-semibold w-28 shrink-0">{label}</span>
                  <span className="text-gray-500">:</span>
                  <span>{value}</span>
                </div>
              ) : null)}
            </div>

            {/* Bill To / Ship To */}
            <div className="grid grid-rows-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Bill To</p>
                <p className="font-semibold text-gray-800">{data.billcustomer_name}</p>
                <p className="text-gray-500 whitespace-pre-line">{data.billcustomer_address}</p>
                {isDomestic && <p className="text-gray-500 mt-0.5">GSTIN: {data.billcustomer_gstin}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Ship To</p>
                <p className="font-semibold text-gray-800">{data.shipcustomer_name}</p>
                <p className="text-gray-500 whitespace-pre-line">{data.shipcustomer_address}</p>
              </div>
            </div>
          </div>

          {/* Subject */}
          {data.subject && (
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-2 rounded-r-lg text-xs text-gray-700">
              <span className="font-semibold">Subject: </span>{data.subject}
            </div>
          )}

          {/* Items table */}
          {/* <table className="w-full text-xs mb-4 table-fixed border-collapse">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="px-2 py-2 text-center">Sl</th>
                <th className="px-2 py-2 text-left">Item </th>
                <th className="px-2 py-2 text-center">HSN/SAC</th>
                <th className="px-2 py-2 text-center">Items</th>
                <th className="px-2 py-2 text-center">Rate</th>

                {isDomestic ? (
                  <>
                    <th className="px-2 py-2 text-center">CGST%</th>
                    <th className="px-2 py-2 text-center">CGST Amt</th>
                    <th className="px-2 py-2 text-center">SGST%</th>
                    <th className="px-2 py-2 text-center">Amt</th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-2 text-center">IGST%</th>
                    <th className="px-2 py-2 text-center">Amt</th>
                  </>
                )}

                <th className="px-2 py-2 text-center">Amount</th>
              </tr>
            </thead>

            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-indigo-50"}
                  >
                    <td className="px-2 py-2 text-center text-gray-600">
                      {index + 1}
                    </td>

                    <td className="px-2 py-2 text-left text-gray-800 wrap-break-word">
                      {item.description}
                    </td>

                    <td className="px-2 py-2 text-center text-gray-600">
                      {item.hsn_code || "-"}
                    </td>

                    <td className="px-2 py-2 text-center text-gray-700">
                      {item.hours}
                    </td>

                    <td className="px-2 py-2 text-center text-gray-700">
                      {formatNumber(item.rate || 0, data.currency_type)}
                    </td>

                    {isDomestic ? (
                      <>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {item?.cgst?.cgstPercent || "0"}
                        </td>

                        <td className="px-2 py-2 text-center text-gray-700">
                          {formatNumber(
                            item?.cgst?.cgstAmount || 0,
                            data.currency_type
                          )}
                        </td>

                        <td className="px-2 py-2 text-center text-gray-600">
                          {item?.sgst?.sgstPercent || "0"}
                        </td>

                        <td className="px-2 py-2 text-center text-gray-700">
                          {formatNumber(
                            item?.sgst?.sgstAmount || 0,
                            data.currency_type
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {item?.igst?.igstPercent || "0"}
                        </td>

                        <td className="px-2 py-2 text-center text-gray-700">
                          {formatNumber(
                            item?.igst?.igstAmount || 0,
                            data.currency_type
                          )}
                        </td>
                      </>
                    )}

                    <td className="px-2 py-2 text-center font-semibold text-gray-800">
                      {formatNumber(item.itemTotal || 0, data.currency_type)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isDomestic ? 10 : 8}
                    className="px-2 py-4 text-center text-gray-400"
                  >
                    No items added
                  </td>
                </tr>
              )}
            </tbody>
          </table> */}
          <table
            className="w-full text-[11px] mb-4 border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                }}
              >
                <th className="py-2 text-center" style={{ width: "4%" }}>
                  Sl
                </th>

                <th className="py-2 text-center" style={{ width: "22%" }}>
                  Item
                </th>

                <th className="py-2 text-center" style={{ width: "10%" }}>
                  HSN/SAC
                </th>

                <th className="py-2 text-center" style={{ width: "8%" }}>
                  Qty
                </th>

                <th className="py-2 text-center" style={{ width: "12%" }}>
                  Rate
                </th>

                {isDomestic ? (
                  <>
                    <th className="py-2 text-center" style={{ width: "8%" }}>
                      CGST%
                    </th>

                    <th className="py-2 text-center" style={{ width: "12%" }}>
                      CGST
                    </th>

                    <th className="py-2 text-center" style={{ width: "8%" }}>
                      SGST%
                    </th>

                    <th className="py-2 text-center" style={{ width: "12%" }}>
                      SGST
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-2 text-center" style={{ width: "10%" }}>
                      IGST%
                    </th>

                    <th className="py-2 text-center" style={{ width: "14%" }}>
                      IGST
                    </th>
                  </>
                )}

                <th
                  className="py-2 text-center"
                  style={{ width: "14%" }}
                >
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? "#ffffff" : "#eef2ff",
                  }}
                >
                  <td className="py-2 text-center align-middle">
                    {index + 1}
                  </td>

                  <td
                    className="py-2 text-center align-middle"
                    style={{
                      wordBreak: "break-word",
                    }}
                  >
                    {item.description}
                  </td>

                  <td className="py-2 text-center align-middle">
                    {item.hsn_code || "-"}
                  </td>

                  <td className="py-2 text-center align-middle">
                    {item.hours}
                  </td>

                  <td
                    className="py-2 text-center align-middle"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNumber(
                      item.rate || 0,
                      data.currency_type
                    )}
                  </td>

                  {isDomestic ? (
                    <>
                      <td className="py-2 text-center align-middle">
                        {item?.cgst?.cgstPercent || "0"}
                      </td>

                      <td
                        className="py-2 text-center align-middle"
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatNumber(
                          item?.cgst?.cgstAmount || 0,
                          data.currency_type
                        )}
                      </td>

                      <td className="py-2 text-center align-middle">
                        {item?.sgst?.sgstPercent || "0"}
                      </td>

                      <td
                        className="py-2 text-center align-middle"
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatNumber(
                          item?.sgst?.sgstAmount || 0,
                          data.currency_type
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 text-center align-middle">
                        {item?.igst?.igstPercent || "0"}
                      </td>

                      <td
                        className="py-2 text-center align-middle"
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatNumber(
                          item?.igst?.igstAmount || 0,
                          data.currency_type
                        )}
                      </td>
                    </>
                  )}

                  <td
                    className="py-2 text-center font-semibold align-middle"
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNumber(
                      item.itemTotal || 0,
                      data.currency_type
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + Bank */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Bank + Terms */}
            <div className="text-xs text-gray-700 space-y-3">
              {(() => {
                const required = [orgData?.accountHolder, orgData?.accountNumber, orgData?.bankName, orgData?.ifscCode];
                const hasBank = required.every((f) => f && f.trim() !== "");
                return hasBank ? (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Bank Details</p>
                    {[
                      ["Account Name", orgData?.accountHolder],
                      ["Account No.", orgData?.accountNumber],
                      ["Account Type", orgData?.accountType],
                      ["IFSC Code", orgData?.ifscCode],
                      ["Bank Name", orgData?.bankName],
                      ["Branch", orgData?.bankBranch],
                      ...(isInternational ? [["Swift Code", orgData?.swiftCode]] : []),
                      ...(isDomestic ? [["UPI ID", orgData?.upiId]] : []),
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-1 mb-0.5">
                        <span className="font-semibold w-24 shrink-0">{label}</span>
                        <span className="text-gray-400">:</span>
                        <span>{value}</span>
                      </div>
                    ) : null)}
                  </div>
                ) : null;
              })()}
              {termsToRender.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Terms &amp; Conditions</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                    {termsToRender.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="text-xs">
              <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Sub Total</span>
                  <span className="font-semibold">{currSym} {formatNumber(subTotal || 0, data.currency_type)}</span>
                </div>
                <div className="border-t border-indigo-100 my-1" />
                {allPercents.map((percent, index) => {
                  const key = String(percent);
                  const lines = [];
                  if (isDomestic) {
                    if (groupedTaxes.cgst?.[key] !== undefined) lines.push({ label: `CGST (${percent}%)`, value: groupedTaxes.cgst[key] });
                    if (groupedTaxes.sgst?.[key] !== undefined) lines.push({ label: `SGST (${percent}%)`, value: groupedTaxes.sgst[key] });
                  } else if (isInternational) {
                    if (groupedTaxes.igst?.[key] !== undefined) lines.push({ label: `IGST (${percent}%)`, value: groupedTaxes.igst[key] });
                  }
                  if (!lines.length) return null;
                  return (
                    <React.Fragment key={percent}>
                      {index > 0 && <div className="border-t border-indigo-100 my-1" />}
                      {lines.map((l) => (
                        <div key={l.label} className="flex justify-between text-gray-600">
                          <span>{l.label}</span>
                          <span className="font-semibold">{currSym} {formatNumber(l.value, data.currency_type)}</span>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}


                <div className="flex border-t border-indigo-100 justify-between text-gray-700 pt-2 mt-2">
                  <span>Total GST</span>
                  <span className="font-semibold">
                    {currSym} {formatNumber(
                      isDomestic
                        ? parseFloat(totalcgst) + parseFloat(totalsgst)
                        : parseFloat(totaligst),
                      data.currency_type
                    )}
                  </span>
                </div>
                <div className="border-t border-indigo-300 pt-2 mt-2 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Grand Total</span>
                  <span className="font-extrabold text-indigo-700 text-base">{currSym} {formatNumber(total || 0, data.currency_type)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-700 mb-12">For {data.company_name}</p>
              <div className="border-t border-gray-400 pt-1">
                <p className="text-xs text-gray-500">Authorized Signatory</p>
              </div>
            </div>
          </div>

          {footerNoteLines.length > 0 && (
            <div className="mt-auto pt-3 text-center text-xs leading-5 text-gray-500 border-t border-gray-200">
              {footerNoteLines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
        </div>

        {/* Bottom accent bar */}
        {/* <div className="h-2 bg-indigo-600 rounded-b" /> */}
      </div>
    </div>
  );
};

export default InvoiceReportGenerationV2;
