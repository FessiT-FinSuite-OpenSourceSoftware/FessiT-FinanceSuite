import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toast } from "react-toastify";
import { savePdf, showDownloadNotification } from "../../utils/pdfUtils";
import fallbackLogo from "../../assets/FessiTLogoTrans.png";

async function generatePdf(challanNo) {
  const toastId = toast.loading("Generating PDF...");
  try {
    const el = document.getElementById("challan-print-area");
    if (!el) throw new Error("Print area not found");
    const canvas = await html2canvas(el, { scale: 4, useCORS: true, backgroundColor: "#ffffff", logging: false });
    const imgData = canvas.toDataURL("image/jpeg");
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 5;
    let iw = pw - margin * 2;
    let ih = (canvas.height * iw) / canvas.width;
    if (ih > ph - margin * 2) { const r = (ph - margin * 2) / ih; iw *= r; ih *= r; }
    pdf.addImage(imgData, "JPEG", (pw - iw) / 2, margin, iw, ih);
    const fileName = `challan-${challanNo || "dc"}.pdf`;
    const filePath = await savePdf(pdf, fileName);
    toast.dismiss(toastId);
    await showDownloadNotification(fileName, filePath);
  } catch (err) {
    toast.update(toastId, { render: `Failed: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
  }
}

const formatDate = (v) => {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d)) return v;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return v; }
};

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function DeliveryChallanReport({ challanData, orgData, onBack }) {
  const [logoUrl, setLogoUrl] = useState(fallbackLogo);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    const logoFilename = challanData?.linkedLogo || orgData?.logo || "";
    if (!logoFilename) { setLogoLoading(false); return; }
    setLogoLoading(true);
    axiosInstance.get(`/organisation-logo/${logoFilename}`, { responseType: "blob" })
      .then((res) => { if (!cancelled) { objectUrl = URL.createObjectURL(res.data); setLogoUrl(objectUrl); } })
      .catch(() => { if (!cancelled) setLogoUrl(fallbackLogo); })
      .finally(() => { if (!cancelled) setLogoLoading(false); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [challanData?.linkedLogo, orgData?.logo]);

  if (logoLoading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );

  const dc    = challanData || {};
  const items = Array.isArray(dc.items) ? dc.items : [];
  const org   = orgData || {};

  const noteLines = (dc.delivery_notes || "").split("\n").map(l => l.trim()).filter(Boolean);

  // cell style helpers
  const th = { padding: "0.4rem 0.6rem", fontWeight: 700, background: "#f5f5f5", fontSize: 11 };
  const td = { padding: "0.4rem 0.6rem", fontSize: 11 };
  const borderRight = { borderRight: "1px solid #999" };
  const borderBottom = { borderBottom: "1px solid #999" };

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white invoice-wrapper">
      {/* Top action bar */}
      <div className="mx-auto mb-4 flex justify-between items-center print-hidden" style={{ maxWidth: "820px", padding: "0 1rem" }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          <span className="text-lg font-semibold text-gray-800">Preview</span>
        </div>
        <button onClick={() => generatePdf(dc.challan_no)}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 cursor-pointer">
          Download PDF
        </button>
      </div>

      {/* ── A4 Print Area ── */}
      <div
        id="challan-print-area"
        className="invoice-a4 mx-auto flex flex-col bg-white shadow-lg text-sm border-[1.4px] border-gray-400"
        style={{ padding: "1rem", maxWidth: "820px", fontFamily: "Arial, sans-serif" }}
      >

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "2px solid #333", paddingBottom: "1rem" }}>
          {/* Left: logo + company info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src={logoUrl} alt="Logo" style={{ height: 48, objectFit: "contain", flexShrink: 0, display: "block" }} />
            <div>
              <h1 style={{ margin: "0 0 0.25rem", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                {dc.consignor_name || org.organizationName || ""}
              </h1>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "#333", whiteSpace: "pre-line" }}>
                {[dc.consignor_address || org.addresses?.[0]?.value, (dc.consignor_gstin || org.gstIN) ? `GSTIN: ${dc.consignor_gstin || org.gstIN}` : null, org.phone, org.email].filter(Boolean).join("\n")}
              </p>
            </div>
          </div>
          {/* Right: title + status */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: 2, color: "#1a1a1a" }}>DELIVERY CHALLAN</h2>
            {dc.status && (
              <span style={{
                display: "inline-block", marginTop: "0.5rem", padding: "0.2rem 0.75rem",
                borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: dc.status === "Delivered" ? "#dcfce7" : dc.status === "Dispatched" ? "#dbeafe" : dc.status === "Cancelled" ? "#fee2e2" : "#f3f4f6",
                color: dc.status === "Delivered" ? "#166534" : dc.status === "Dispatched" ? "#1d4ed8" : dc.status === "Cancelled" ? "#991b1b" : "#374151",
              }}>{dc.status}</span>
            )}
          </div>
        </div>

        {/* Document Details + Purpose */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {/* Left: challan details */}
          <div style={{ border: "1px solid #999" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              {[
                ["Challan No",      dc.challan_no],
                ["Challan Date",    formatDate(dc.challan_date)],
                ["Dispatch Date",   formatDate(dc.dispatch_date)],
                ["Invoice Ref",     dc.invoice_ref],
                ["PO Reference",    dc.po_reference],
                ["Place of Supply", dc.place_of_supply],
              ].map(([label, value], i, arr) => value ? (
                <tr key={label} style={i < arr.length - 1 ? borderBottom : {}}>
                  <td style={{ ...th, ...borderRight, width: "45%" }}>{label}</td>
                  <td style={td}>{value}</td>
                </tr>
              ) : null)}
            </table>
          </div>

          {/* Right: purpose */}
          <div style={{ border: "1px solid #999" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <tr style={borderBottom}>
                <td style={th}>Purpose of Delivery</td>
              </tr>
              <tr>
                <td style={td}>{dc.purpose || "—"}</td>
              </tr>
            </table>
          </div>
        </div>

        {/* Consignor / Consignee */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {[
            { title: "Consignor (From)", name: dc.consignor_name, address: dc.consignor_address, gstin: dc.consignor_gstin },
            { title: "Consignee (To)",   name: dc.consignee_name, address: dc.consignee_address, gstin: dc.consignee_gstin },
          ].map(({ title, name, address, gstin }) => (
            <div key={title} style={{ border: "1px solid #999" }}>
              <div style={{ ...th, ...borderBottom, display: "block" }}>{title}</div>
              <div style={{ padding: "0.75rem", fontSize: 11, lineHeight: 1.6 }}>
                {name && <p style={{ margin: "0 0 0.4rem", fontWeight: 700 }}>{name}</p>}
                <p style={{ margin: 0, whiteSpace: "pre-line" }}>
                  {address}
                  {gstin && `\nGSTIN: ${gstin}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "1rem", border: "1px solid #999" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", ...borderBottom }}>
                <th style={{ ...th, ...borderRight, textAlign: "center", width: 40 }}>Sl No</th>
                <th style={{ ...th, ...borderRight, textAlign: "left" }}>Description of Goods</th>
                <th style={{ ...th, ...borderRight, textAlign: "center", width: 60 }}>HSN/CAC</th>
                <th style={{ ...th, ...borderRight, textAlign: "center", width: 60 }}>Qty</th>
                <th style={{ ...th, textAlign: "center", width: 70 }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item, idx) => (
                <tr key={idx} style={idx < items.length - 1 ? borderBottom : {}}>
                  <td style={{ ...td, ...borderRight, textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ ...td, ...borderRight }}>{item.description || "—"}</td>
                  <td style={{ ...td, ...borderRight, textAlign: "center" }}>{item.hsn_code || "—"}</td>
                  <td style={{ ...td, ...borderRight, textAlign: "center", fontWeight: 500 }}>{item.quantity || "—"}</td>
                  <td style={{ ...td, textAlign: "center" }}>{item.unit || "—"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "center", color: "#999" }}>No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delivery Notes */}
        {noteLines.length > 0 && (
          <div style={{ marginBottom: "1rem", border: "1px solid #999" }}>
            <div style={{ ...th, ...borderBottom, display: "block" }}>Delivery Notes</div>
            <div style={{ padding: "0.75rem", fontSize: 11, lineHeight: 1.6 }}>
              {noteLines.map((l, i) => <p key={i} style={{ margin: i < noteLines.length - 1 ? "0 0 0.25rem" : 0 }}>{l}</p>)}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { title: "Dispatched By",  sub: "Consignor's Sign" },
              { title: "In Transit",     sub: "Driver's Signature" },
              { title: "Received By",    sub: "Consignee's Sign" },
            ].map(({ title, sub }) => (
              <div key={title} style={{ border: "1px solid #999", textAlign: "center" }}>
                <div style={{ height: 60, borderBottom: "1px solid #999" }} />
                <p style={{ margin: "0.5rem 0 0", fontSize: 11, fontWeight: 700 }}>{title}</p>
                <p style={{ margin: "0.25rem 0 0.5rem", fontSize: 10, color: "#666" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10, color: "#666", paddingTop: "1rem", borderTop: "1px solid #999" }}>
          <p style={{ margin: 0 }}>This is a computer-generated document. No signature is required.</p>
          <p style={{ margin: "0.25rem 0 0" }}>Printed on: {today}{dc.challan_no ? `` : ""}</p>
        </div>
      </div>
    </div>
  );
}
