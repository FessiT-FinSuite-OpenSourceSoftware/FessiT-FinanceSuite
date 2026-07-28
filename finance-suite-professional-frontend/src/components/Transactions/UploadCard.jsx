import React, { useRef, useState, useEffect } from "react";
import { CloudUpload, FileText, RefreshCw, AlertCircle, X, Check, Edit2, Save } from "lucide-react";
import { ACCEPTED } from "./constants";
import { maskAccountNumber, getConfidenceMeta, getRawOcrDisplay } from "./helpers";
import ReviewTable from "./ReviewTable";

const fmt = (n) =>
  "₹ " + Math.abs(parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, disabled }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const handle = (f) => { if (f && !disabled) onFile(f); };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); !disabled && setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => !disabled && ref.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition-colors select-none
        ${disabled ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-700" :
          drag ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" :
          "border-gray-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${drag ? "bg-indigo-200 dark:bg-indigo-800" : "bg-indigo-100 dark:bg-indigo-900/40"}`}>
        <CloudUpload className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          {drag ? "Drop to upload" : "Drop your bank statement here"}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">PDF, XLSX, or CSV · Max 20 MB</p>
        <p className="text-xs text-indigo-500 mt-1 font-medium">or click to browse</p>
      </div>
      <input ref={ref} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handle(e.target.files[0])} />
    </div>
  );
}

// ── Processing Spinner ────────────────────────────────────────────────────────
function ProcessingCard({ fileName, stage, liveCount }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);
  const stageCopy = {
    uploading:  "Uploading statement…",
    extracting: "Extracting text from the document… This may take about 30–60 seconds.",
    parsing:    liveCount > 0 ? `Parsing… ${liveCount} transaction${liveCount !== 1 ? "s" : ""} found so far` : "Parsing extracted data…",
  };
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="w-6 h-6 text-indigo-500" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{stageCopy[stage] || `Processing statement${dots}`}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs truncate">{fileName}</p>
      </div>
    </div>
  );
}

// ── UploadCard ────────────────────────────────────────────────────────────────
export default function UploadCard({
  isUploading, isStreaming, isSaving, uploadError, uploadStage,
  statementMeta, showDebug, debugData,
  reviewRows, isEditingReview, recordTitle,
  reviewPage, reviewPageSize,
  onFile, onDiscard, onToggleEdit, onSaveAll,
  onRowChange, onRemoveRow, onAddRow,
  onReviewPageChange, onReviewPageSizeChange,
  onRecordTitleChange, onClearError,
}) {
  const isReviewing = reviewRows.length > 0;
  const validRows   = reviewRows.filter((r) => r.narration || r.description || r.reference || r.debit || r.credit);
  const showLive    = isUploading && reviewRows.length > 0;

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
            {isReviewing ? "Review Extracted Transactions" : "Import Bank Statement"}
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {isReviewing
              ? isStreaming
                ? <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />{reviewRows.length} transaction{reviewRows.length !== 1 ? "s" : ""} found so far — fetching more…</span>
                : `${reviewRows.length} transaction${reviewRows.length !== 1 ? "s" : ""} extracted — edit if needed, then save`
              : "Upload a bank statement (PDF, XLSX, or CSV) — transactions will be extracted automatically"}
          </p>
        </div>
        {isReviewing && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={onDiscard} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <X className="w-3.5 h-3.5" /> Discard
            </button>
            <button onClick={onToggleEdit} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-60">
              {isEditingReview ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isEditingReview ? "Done editing" : "Edit data"}
            </button>
            <button onClick={onSaveAll} disabled={isSaving || isStreaming || !validRows.length || !recordTitle.trim()} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving…" : isStreaming ? "Fetching…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isUploading ? (
        <>
          <ProcessingCard fileName={reviewRows[0]?.fileName ?? "Processing…"} stage={uploadStage} liveCount={reviewRows.length} />
          {showLive && (
            <ReviewTable rows={reviewRows} isEditing={false} onChange={onRowChange} onRemove={onRemoveRow} onAddRow={onAddRow}
              page={reviewPage} pageSize={reviewPageSize} onPageChange={onReviewPageChange} onPageSizeChange={onReviewPageSizeChange} isStreaming />
          )}
        </>
      ) : uploadError ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Extraction Failed</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{uploadError}</p>
          </div>
          <button onClick={onClearError} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : isReviewing ? (
        <>
          {statementMeta && (
            <>
              <div className="mb-3 grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Account</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{statementMeta.account_holder || "—"}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{statementMeta.bank_name || "—"}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{maskAccountNumber(statementMeta.account_number)}</p>
                  {statementMeta.ifsc && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">IFSC: {statementMeta.ifsc}</p>}
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50/70 p-4 dark:border-red-900/70 dark:bg-red-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-500">Total Debit</p>
                  <p className="mt-2 text-lg font-semibold text-red-600 dark:text-red-400">{fmt(statementMeta.total_debit ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 dark:border-green-900/70 dark:bg-green-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500">Total Credit</p>
                  <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-400">{fmt(statementMeta.total_credit ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900/70 dark:bg-sky-950/30">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-500">Closing Balance</p>
                  <p className="mt-2 text-lg font-semibold text-sky-600 dark:text-sky-400">{fmt(statementMeta.closing_balance ?? 0)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{statementMeta.period_from ? `${statementMeta.period_from} → ${statementMeta.period_to}` : "—"}</p>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {statementMeta.average_confidence != null && (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${statementMeta.average_confidence > 0.85 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400" : statementMeta.average_confidence >= 0.6 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    OCR Confidence {getConfidenceMeta(statementMeta.average_confidence).label}
                  </span>
                )}
                {statementMeta.pages != null && (
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {statementMeta.pages} pages scanned
                  </span>
                )}
              </div>
              {showDebug && (
                <pre className="mb-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-[11px] text-slate-200 dark:border-slate-700">
                  {getRawOcrDisplay(debugData)}
                </pre>
              )}
            </>
          )}
          <div className="mb-3 flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isEditingReview ? "Editing is enabled. Verify amounts, dates and types before saving." : "Review the parsed data below. Choose Edit data to make corrections before saving."}
            </p>
          </div>
          <ReviewTable rows={reviewRows} isEditing={isEditingReview} onChange={onRowChange} onRemove={onRemoveRow} onAddRow={onAddRow}
            page={reviewPage} pageSize={reviewPageSize} onPageChange={onReviewPageChange} onPageSizeChange={onReviewPageSizeChange} />
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
              Record Title <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col gap-1">
              <input type="text" value={recordTitle} onChange={(e) => onRecordTitleChange(e.target.value)} placeholder="e.g. HDFC July 2025"
                className={`max-w-xs border rounded px-2 py-1 text-xs bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                  recordTitle.trim() === "" ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-slate-700"
                }`} />
              {/* {recordTitle.trim() === "" && (
                <p className="text-[10px] text-red-500">Title is required before uploading</p>
              )} */}
            </div>
          </div>
          <UploadZone onFile={onFile} disabled={isUploading || recordTitle.trim() === ""} />
        </div>
      )}
    </div>
  );
}
