import React, { useState, lazy, Suspense } from "react";

const InvoiceReportGeneration = lazy(() => import("./invoiceReportGeneration"));
const InvoiceReportGenerationV2 = lazy(() => import("./InvoiceReportGenerationV2"));
const InvoiceReportGenerationV3 = lazy(() => import("./InvoiceReportGenerationV3"));

const TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional bordered table layout",
    preview: (
      <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="4" y="4" width="38" height="5" rx="1" fill="#e0e7ff" />
        <rect x="68" y="4" width="28" height="5" rx="1" fill="#c7d2fe" />
        <line x1="4" y1="14" x2="96" y2="14" stroke="#d1d5db" strokeWidth="0.8" />
        <rect x="4" y="17" width="42" height="4" rx="1" fill="#f3f4f6" />
        <rect x="54" y="17" width="42" height="4" rx="1" fill="#f3f4f6" />
        <line x1="4" y1="25" x2="96" y2="25" stroke="#d1d5db" strokeWidth="0.8" />
        <rect x="4" y="27" width="92" height="5" rx="1" fill="#e0e7ff" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="4" y={34 + i * 6} width="92" height="4" rx="0.5" fill={i % 2 === 0 ? "#f9fafb" : "#fff"} />
        ))}
        <rect x="58" y="56" width="38" height="4" rx="1" fill="#e0e7ff" />
        <rect x="58" y="62" width="38" height="4" rx="1" fill="#4f46e5" />
      </svg>
    ),
  },
  {
    id: "modern",
    name: "Modern",
    description: "Card layout with indigo accents",
    preview: (
      <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="100" height="4" fill="#4f46e5" />
        <circle cx="12" cy="14" r="5" fill="#e0e7ff" />
        <rect x="20" y="11" width="26" height="3" rx="1" fill="#4f46e5" />
        <rect x="20" y="16" width="18" height="2" rx="1" fill="#a5b4fc" />
        <rect x="68" y="9" width="28" height="9" rx="2" fill="#4f46e5" />
        <rect x="70" y="12" width="24" height="3" rx="1" fill="#fff" opacity="0.8" />
        <rect x="4" y="24" width="44" height="14" rx="2" fill="#f5f3ff" />
        <rect x="52" y="24" width="44" height="6" rx="2" fill="#f5f3ff" />
        <rect x="52" y="32" width="44" height="6" rx="2" fill="#f5f3ff" />
        <rect x="4" y="42" width="92" height="5" rx="1" fill="#4f46e5" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="4" y={49 + i * 5} width="92" height="3" rx="0.5" fill={i % 2 === 0 ? "#f5f3ff" : "#fff"} />
        ))}
        <rect x="0" y="67" width="100" height="3" fill="#4f46e5" />
      </svg>
    ),
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean Helvetica-style, totals right, bank at bottom",
    preview: (
      <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="4" y="4" width="18" height="8" rx="1" fill="#e5e7eb" />
        <rect x="4" y="14" width="28" height="3" rx="1" fill="#d1d5db" />
        <rect x="4" y="19" width="22" height="2" rx="1" fill="#e5e7eb" />
        <rect x="60" y="4" width="36" height="5" rx="1" fill="#111" opacity="0.8" />
        <rect x="60" y="11" width="28" height="2" rx="1" fill="#d1d5db" />
        <rect x="60" y="15" width="28" height="2" rx="1" fill="#d1d5db" />
        <rect x="60" y="19" width="28" height="2" rx="1" fill="#d1d5db" />
        <line x1="4" y1="26" x2="96" y2="26" stroke="#ddd" strokeWidth="0.8" />
        <rect x="4" y="27" width="92" height="4" rx="0" fill="#f5f5f5" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="4" y={33 + i * 5} width="92" height="4" rx="0" fill={i % 2 === 0 ? "#fff" : "#fafafa"} />
        ))}
        <line x1="4" y1="48" x2="96" y2="48" stroke="#ddd" strokeWidth="0.8" />
        <rect x="60" y="51" width="36" height="2" rx="1" fill="#e5e7eb" />
        <rect x="60" y="55" width="36" height="2" rx="1" fill="#e5e7eb" />
        <rect x="60" y="59" width="36" height="3" rx="1" fill="#111" opacity="0.7" />
        <rect x="4" y="63" width="40" height="2" rx="1" fill="#e5e7eb" />
        <rect x="58" y="63" width="38" height="2" rx="1" fill="#e5e7eb" />
      </svg>
    ),
  },
];

export default function InvoiceReportWrapper({ invoiceData, orgData, onBack }) {
  const [selectedTemplate, setSelectedTemplate] = useState("classic");

  const PreviewComponent =
    selectedTemplate === "modern" ? InvoiceReportGenerationV2 :
    selectedTemplate === "minimal" ? InvoiceReportGenerationV3 :
    InvoiceReportGeneration;

  return (
    <div className="flex min-h-screen bg-gray-100 print:block">

      {/* ── Template sidebar ── */}
      <aside className="print:hidden w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Templates</p>
        </div>
        <div className="flex flex-col gap-2 p-3 flex-1">
          {TEMPLATES.map((t) => {
            const active = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`w-full text-left rounded-xl border-2 p-2 transition-all focus:outline-none ${
                  active
                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >
                
                <p className={`text-xs font-semibold ${active ? "text-indigo-600" : "text-gray-700"}`}>{t.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
                {active && (
                  
                  <>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Invoice preview ── */}
      <div className="flex-1 min-w-0">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="text-gray-500 text-sm">Loading template...</div>
          </div>
        }>
          <PreviewComponent
            invoiceData={invoiceData}
            orgData={orgData}
            onBack={onBack}
          />
        </Suspense>
      </div>
    </div>
  );
}
