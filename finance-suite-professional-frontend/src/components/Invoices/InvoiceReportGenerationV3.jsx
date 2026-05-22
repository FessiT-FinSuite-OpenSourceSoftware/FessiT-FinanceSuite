import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { sampleData } from "./sampleInvoiceData";
import { formatNumber, getCurrencySymbol } from "../../utils/formatNumber";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toast } from "react-toastify";
import { savePdf, showDownloadNotification } from "../../utils/pdfUtils";
import fallbackLogo from "../../assets/FessiTLogoTrans.png";
import { getInvoiceReportLogoFilename } from "./invoiceLogo";

async function generateInvoicePdf(invoiceNumber) {
  const toastId = toast.loading("Generating PDF...");
  try {
    const element = document.getElementById("invoice-print-area");
    if (!element) throw new Error("Invoice area not found");
    const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: "#ffffff", logging: false });
    const imgData = canvas.toDataURL("image/jpeg");
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const m = 5;
    let iw = pw - m * 2;
    let ih = (canvas.height * iw) / canvas.width;
    if (ih > ph - m * 2) { const r = (ph - m * 2) / ih; iw *= r; ih *= r; }
    pdf.addImage(imgData, "JPEG", (pw - iw) / 2, (ph - ih) / 2, iw, ih);
    const fileName = `invoice-${invoiceNumber || "invoice"}.pdf`;
    const filePath = await savePdf(pdf, fileName);
    toast.dismiss(toastId);
    await showDownloadNotification(fileName, filePath);
  } catch (err) {
    toast.update(toastId, { render: `Failed: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
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
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const m = 5;
    let iw = pw - m * 2;
    let ih = (canvas.height * iw) / canvas.width;
    if (ih > ph - m * 2) { const r = (ph - m * 2) / ih; iw *= r; ih *= r; }
    pdf.addImage(imgData, "JPEG", (pw - iw) / 2, (ph - ih) / 2, iw, ih);
    pdf.autoPrint();
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (!win) {
      const fileName = `invoice-${invoiceNumber || "invoice"}.pdf`;
      const filePath = await savePdf(pdf, fileName);
      toast.dismiss(toastId);
      await showDownloadNotification(fileName, filePath);
    } else {
      toast.update(toastId, { render: "Print dialog opened", type: "success", isLoading: false, autoClose: 2000 });
    }
  } catch (err) {
    toast.update(toastId, { render: `Failed: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
  }
}

const InvoiceReportGenerationV3 = ({ invoiceData, orgData, onBack }) => {
  const baseData = invoiceData && Object.keys(invoiceData || {}).length > 0 ? invoiceData : sampleData;

  const [logoUrl, setLogoUrl] = useState(fallbackLogo);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    const fetchLogo = async () => {
      const logoFilename = getInvoiceReportLogoFilename(baseData, orgData);
      if (!logoFilename) { setLogoUrl(fallbackLogo); setLogoLoading(false); return; }
      try {
        const res = await axiosInstance.get(`/organisation-logo/${logoFilename}`, { responseType: "blob" });
        if (!cancelled) { objectUrl = URL.createObjectURL(res.data); setLogoUrl(objectUrl); }
      } catch { if (!cancelled) setLogoUrl(fallbackLogo); }
      finally { if (!cancelled) setLogoLoading(false); }
    };
    setLogoLoading(true);
    fetchLogo();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [baseData?.linkedLogo, baseData?.status, orgData?.logo]);

  if (logoLoading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-gray-500 text-sm">Loading invoice...</div>
    </div>
  );

  const data = { company_logo: logoUrl, ...baseData };
  const items = Array.isArray(data.items) ? data.items : [];
  const isDomestic = (data.invoice_type || "domestic") === "domestic";
  const isInternational = data.invoice_type === "international";
  const currSym = getCurrencySymbol(data.currency_type);

  // Tax grouping
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
  const totalcgst = parseFloat(data.totalcgst || 0);
  const totalsgst = parseFloat(data.totalsgst || 0);
  const totaligst = parseFloat(data.totaligst || 0);
  const total = data.total || (computedSubTotal + totalcgst + totalsgst + totaligst).toFixed(2);

  const allPercents = (() => {
    const s = new Set();
    if (isDomestic) { Object.keys(groupedTaxes.cgst).forEach((p) => s.add(p)); Object.keys(groupedTaxes.sgst).forEach((p) => s.add(p)); }
    else Object.keys(groupedTaxes.igst).forEach((p) => s.add(p));
    return Array.from(s).map(parseFloat).filter((p) => !isNaN(p)).sort((a, b) => a - b);
  })();

  const customTermsLines = (data.notes || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const orgTermsLines = (orgData?.paymentInstructions || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const termsToRender = customTermsLines.length > 0 ? customTermsLines : orgTermsLines;
  const footerNoteLines = (orgData?.footerNote || "").split("\n").map((l) => l.trim()).filter(Boolean);

  const hasBank = [orgData?.accountHolder, orgData?.accountNumber, orgData?.bankName, orgData?.ifscCode].every((f) => f && f.trim() !== "");

  const tdStyle = { borderTop: "1px solid #ddd", padding: "6px 8px", fontSize: "12px", verticalAlign: "top", color: "#333" };
  const thStyle = { ...tdStyle, background: "#f5f5f5", fontWeight: "600" };

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
          <button onClick={() => printInvoicePdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer">Print</button>
          <button onClick={() => generateInvoicePdf(data.invoice_number)} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 cursor-pointer">Download</button>
        </div>
      </div>

      {/* A4 printable area — all inline styles for html2canvas compatibility */}
      <div
        id="invoice-print-area"
        className="invoice-a4 mx-auto bg-white shadow-lg"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "13px", color: "#333", lineHeight: "1.5", padding: "32px", maxWidth: "820px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px" }}>
          {/* Left: logo + company */}
          <div style={{ width: "58%" }}>
            {data.company_logo && (
              <img src={data.company_logo} alt="Logo" style={{ height: "48px", display: "block", marginBottom: "8px", objectFit: "contain" }} />
            )}
            <div style={{ lineHeight: "1.4", fontSize: "12px" }}>
              <strong style={{ fontSize: "14px" }}>{data.company_name}</strong><br />
              <span style={{ whiteSpace: "pre-line" }}>{data.company_address}</span><br />
              {data.gstIN && <span>GSTIN: {data.gstIN}<br /></span>}
              {data.company_email && <span>Email: {data.company_email}<br /></span>}
              {data.company_phone && <span>Ph: +91 {data.company_phone}</span>}
            </div>
          </div>

          {/* Right: invoice meta */}
          <div style={{ textAlign: "right", fontSize: "12px" }}>
            <div style={{ fontSize: "26px", fontWeight: "600", marginBottom: "12px", color: "#111" }}>TAX INVOICE</div>
            <table style={{ marginLeft: "auto", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Invoice No.", data.invoice_number || "-"],
                  ["Date", data.invoice_date || "-"],
                  ["Due Date", data.invoice_dueDate || "-"],
                  ["Terms", data.invoice_terms || "-"],
                  ["Place of Supply", data.place_of_supply || "-"],
                  ["P.O. Number", data.po_number || "-"],
                  ["P.O. Date", data.po_date || "-"],
                  ...(isInternational ? [["LUT No.", data.lut_no || "-"], ["IEC No.", data.iec_no || "-"]] : []),
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: "2px 8px 2px 0", fontWeight: "600", color: "#555", whiteSpace: "nowrap", textAlign: "right" }}>{label}</td>
                    <td style={{ padding: "2px 0", color: "#333", textAlign: "left", whiteSpace: "nowrap" }}>: {value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bill To / Ship To ── */}
        <div style={{ display: "flex", gap: "32px", marginBottom: "24px", fontSize: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Bill To</div>
            <strong>{data.billcustomer_name}</strong><br />
            <span style={{ whiteSpace: "pre-line" }}>{data.billcustomer_address}</span>
            {isDomestic && data.billcustomer_gstin && <><br />GSTIN: {data.billcustomer_gstin}</>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Ship To</div>
            <strong>{data.shipcustomer_name}</strong><br />
            <span style={{ whiteSpace: "pre-line" }}>{data.shipcustomer_address}</span>
          </div>
          {(data.po_number || data.po_date) && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>PO Details</div>
              {data.po_number && <div><strong>PO No.:</strong> {data.po_number}</div>}
              {data.po_date && <div><strong>PO Date:</strong> {data.po_date}</div>}
            </div>
          )}
        </div>

        {/* ── Subject ── */}
        {data.subject && (
          <div style={{ marginBottom: "16px", fontSize: "12px" }}>
            <strong>Subject:</strong> {data.subject}
          </div>
        )}

        {/* ── Items Table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1px solid #ddd", marginBottom: "24px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "4%", textAlign: "center" }}>#</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, width: "8%", textAlign: "center" }}>HSN</th>
              <th style={{ ...thStyle, width: "8%", textAlign: "right" }}>Qty</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Rate</th>
              {isDomestic ? (
                <>
                  <th style={{ ...thStyle, width: "8%", textAlign: "center" }}>CGST%</th>
                  <th style={{ ...thStyle, width: "10%", textAlign: "right" }}>CGST</th>
                  <th style={{ ...thStyle, width: "8%", textAlign: "center" }}>SGST%</th>
                  <th style={{ ...thStyle, width: "10%", textAlign: "right" }}>SGST</th>
                </>
              ) : (
                <>
                  <th style={{ ...thStyle, width: "8%", textAlign: "center" }}>IGST%</th>
                  <th style={{ ...thStyle, width: "10%", textAlign: "right" }}>IGST</th>
                </>
              )}
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ ...tdStyle, textAlign: "center" }}>{idx + 1}</td>
                <td style={tdStyle}>{item.description}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.hsn_code || "-"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.hours}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumber(item.rate || 0, data.currency_type)}</td>
                {isDomestic ? (
                  <>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{item?.cgst?.cgstPercent || "0"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumber(item?.cgst?.cgstAmount || 0, data.currency_type)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{item?.sgst?.sgstPercent || "0"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumber(item?.sgst?.sgstAmount || 0, data.currency_type)}</td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{item?.igst?.igstPercent || "0"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumber(item?.igst?.igstAmount || 0, data.currency_type)}</td>
                  </>
                )}
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{formatNumber(item.itemTotal || 0, data.currency_type)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={isDomestic ? 10 : 8} style={{ ...tdStyle, textAlign: "center", color: "#999" }}>No items added</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Totals (float right style) ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
          <table style={{ width: "38%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#555" }}>Subtotal</td>
                <td style={{ padding: "4px 0", fontSize: "12px", textAlign: "right" }}>{currSym} {formatNumber(subTotal || 0, data.currency_type)}</td>
              </tr>
              {allPercents.map((percent) => {
                const key = String(percent);
                const lines = [];
                if (isDomestic) {
                  if (groupedTaxes.cgst?.[key] !== undefined) lines.push({ label: `CGST (${percent}%)`, value: groupedTaxes.cgst[key] });
                  if (groupedTaxes.sgst?.[key] !== undefined) lines.push({ label: `SGST (${percent}%)`, value: groupedTaxes.sgst[key] });
                } else if (isInternational) {
                  if (groupedTaxes.igst?.[key] !== undefined) lines.push({ label: `IGST (${percent}%)`, value: groupedTaxes.igst[key] });
                }
                return lines.map((l) => (
                  <tr key={l.label}>
                    <td style={{ padding: "4px 0", fontSize: "12px", color: "#555" }}>{l.label}</td>
                    <td style={{ padding: "4px 0", fontSize: "12px", textAlign: "right" }}>{currSym} {formatNumber(l.value, data.currency_type)}</td>
                  </tr>
                ));
              })}
              <tr style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "4px 0", fontSize: "12px", fontWeight: "600", color: "#333" }}>Total Tax</td>
                <td style={{ padding: "4px 0", fontSize: "12px", fontWeight: "600", textAlign: "right", color: "#333" }}>
                  {currSym} {formatNumber(
                    isDomestic ? totalcgst + totalsgst : totaligst,
                    data.currency_type
                  )}
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td style={{ padding: "6px 0 4px", fontSize: "13px", fontWeight: "700" }}>Grand Total</td>
                <td style={{ padding: "6px 0 4px", fontSize: "13px", fontWeight: "700", textAlign: "right" }}>{currSym} {formatNumber(total || 0, data.currency_type)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Notes ── */}
        {termsToRender.length > 0 && (
          <div style={{ textAlign: "center", marginBottom: "24px", fontSize: "12px", color: "#555" }}>
            {termsToRender.map((t, i) => <div key={i}>{t}</div>)}
          </div>
        )}

        {/* ── Bottom: sender details + bank ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", marginBottom: "24px", fontSize: "12px" }}>
          {/* Sender */}
          <div style={{ width: "48%" }}>
            <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>From</div>
            <strong>{data.company_name}</strong><br />
            <span style={{ whiteSpace: "pre-line" }}>{data.company_address}</span><br />
            {data.gstIN && <span>GSTIN: {data.gstIN}<br /></span>}
            {data.company_phone && <span>Phone: +91 {data.company_phone}<br /></span>}
            {data.company_email && <span>Email: {data.company_email}</span>}
          </div>

          {/* Bank */}
          {hasBank && (
            <div style={{ width: "48%", textAlign: "right" }}>
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "4px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#666",
                  width: "fit-content",
                  marginLeft: "auto",
                  marginRight: "52px",
                }}
              >
                BANK DETAILS
              </div>              <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "12px" }}>
                <tbody>
                  {[
                    ["Account Name", orgData?.accountHolder],
                    ["Account No.", orgData?.accountNumber],
                    ["Account Type", orgData?.accountType],
                    ["Bank", orgData?.bankName],
                    ["IFSC", orgData?.ifscCode],
                    ["Branch", orgData?.bankBranch],
                    ...(isInternational && orgData?.swiftCode ? [["Swift", orgData.swiftCode]] : []),
                    ...(isDomestic && orgData?.upiId ? [["UPI", orgData.upiId]] : []),
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: "2px 8px 2px 0", fontWeight: "600", color: "#555", whiteSpace: "nowrap", textAlign: "right" }}>{label}</td>
                      <td style={{ padding: "2px 0", color: "#333", textAlign: "left", whiteSpace: "nowrap" }}>: {value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Signature ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "32px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "40px" }}>For {data.company_name}</div>
            <div style={{ borderTop: "1px solid #aaa", paddingTop: "4px", fontSize: "11px", color: "#777" }}>Authorized Signatory</div>
          </div>
        </div>

        {/* ── Footer note ── */}
        {footerNoteLines.length > 0 ? (
          <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: "12px", textAlign: "center", fontSize: "11px", color: "#888" }}>
            {footerNoteLines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        ) : (
          <div style={{ marginTop: "auto" }} />
        )}
      </div>
    </div>
  );
};

export default InvoiceReportGenerationV3;
