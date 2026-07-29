import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  transactionsSelector, fetchRecords,
  uploadStatement, saveExtracted, deleteRecord, updateRecordStatus, updateRecordNotes,
  clearExtracted, setUploadError,
} from "../../ReduxApi/transactions";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite as checkCanWrite, Module } from "../../utils/permissions";
import { isAllowedFile } from "./helpers";
import { EMPTY_ROW } from "./constants";

import UploadCard  from "./UploadCard";
import RecordsList from "./RecordsList";

const PdfPasswordModal = lazy(() => import("./PdfPasswordModal"));

export default function Transactions() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user } = useSelector(authSelector);
  const canWrite = checkCanWrite(user, Module.Transactions);
  const {
    isRecordLoading, isUploading, isStreaming, isSaving,
    records, extracted, uploadError, statementMeta, uploadStage,
  } = useSelector(transactionsSelector);

  const [recordTitle,      setRecordTitle]      = useState("");
  const [reviewRows,       setReviewRows]        = useState([]);
  const [isEditingReview,  setIsEditingReview]   = useState(false);
  const [reviewPage,       setReviewPage]        = useState(1);
  const [reviewPageSize,   setReviewPageSize]    = useState(10);
  const [pendingFile,      setPendingFile]       = useState(null);
  const [pdfPasswordState, setPdfPasswordState]  = useState(null);
  const [showDebug,        setShowDebug]         = useState(false);
  const [debugData,        setDebugData]         = useState(null);

  // ── Sync extracted rows into reviewRows during streaming ───────────────────
  useEffect(() => {
    if (!extracted.length) return;
    setReviewRows((prev) => {
      if (prev.length === extracted.length) return prev;
      if (prev.length === 0) { setReviewPage(1); return extracted.map((r) => ({ ...r })); }
      return [...prev, ...extracted.slice(prev.length).map((r) => ({ ...r }))];
    });
  }, [extracted]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => { dispatch(fetchRecords()); }, [dispatch]);

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleFileSelected = useCallback((file) => {
    if (!isAllowedFile(file)) { dispatch(setUploadError("Unsupported file type. Please upload a PDF, XLSX, or CSV file.")); return; }
    setPendingFile(file);
    dispatch(uploadStatement(file)).then((result) => {
      if (result === "password_required") setPdfPasswordState({ file, isWrongPassword: false });
    });
  }, [dispatch]);

  const handlePasswordSubmit = useCallback((password) => {
    const { file } = pdfPasswordState;
    setPdfPasswordState(null);
    dispatch(uploadStatement(file, password)).then((result) => {
      if (result === "invalid_password") setPdfPasswordState({ file, isWrongPassword: true });
    });
  }, [dispatch, pdfPasswordState]);

  const handlePasswordCancel = useCallback(() => {
    setPdfPasswordState(null);
    dispatch(setUploadError(null));
    setPendingFile(null);
  }, [dispatch]);

  // ── Review table handlers ──────────────────────────────────────────────────
  const handleRowChange  = useCallback((i, key, val) => setReviewRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r)), []);
  const handleRemoveRow  = useCallback((i) => setReviewRows((prev) => prev.filter((_, idx) => idx !== i)), []);
  const handleAddRow     = useCallback(() => setReviewRows((prev) => [...prev, EMPTY_ROW()]), []);

  const handleDiscard = useCallback(() => {
    dispatch(clearExtracted());
    setReviewRows([]);
    setIsEditingReview(false);
    setPendingFile(null);
    setShowDebug(false);
    setDebugData(null);
    setRecordTitle("");
  }, [dispatch]);

  const handleSaveAll = useCallback(async () => {
    const rowsToSave = reviewRows
      .filter((r) => r.narration || r.description || r.reference || r.debit || r.credit)
      .map((r) => {
        const narration = (r.narration ?? r.description ?? "").trim();
        const debit   = r.debit   === "" || r.debit   == null ? null : parseFloat(r.debit);
        const credit  = r.credit  === "" || r.credit  == null ? null : parseFloat(r.credit);
        const balance = r.balance === "" || r.balance == null ? null : (Number.isFinite(parseFloat(r.balance)) ? parseFloat(r.balance) : null);
        return { ...r, narration, description: narration, reference: (r.reference ?? "").trim(), category: (r.category ?? "").trim(), debit, credit, balance, amount: debit ?? credit ?? 0, type: debit != null ? "Debit" : "Credit" };
      });
    if (!rowsToSave.length) return;
    const saved = await dispatch(saveExtracted(rowsToSave, recordTitle.trim()));
    if (saved) { setReviewRows([]); setIsEditingReview(false); setPendingFile(null); setRecordTitle(""); }
  }, [dispatch, reviewRows, recordTitle]);

  const handleSelectRecord = useCallback((rec) => {
    navigate(`/transactions/${rec.id}`);
  }, [navigate]);

  return (
    <div className="w-full space-y-4">

      {canWrite && (
      <UploadCard
        isUploading={isUploading}
        isStreaming={isStreaming}
        isSaving={isSaving}
        uploadError={uploadError}
        uploadStage={uploadStage}
        statementMeta={statementMeta}
        showDebug={showDebug}
        debugData={debugData}
        reviewRows={reviewRows}
        isEditingReview={isEditingReview}
        recordTitle={recordTitle}
        reviewPage={reviewPage}
        reviewPageSize={reviewPageSize}
        onFile={handleFileSelected}
        onDiscard={handleDiscard}
        onToggleEdit={() => setIsEditingReview((v) => !v)}
        onSaveAll={handleSaveAll}
        onRowChange={handleRowChange}
        onRemoveRow={handleRemoveRow}
        onAddRow={handleAddRow}
        onReviewPageChange={setReviewPage}
        onReviewPageSizeChange={setReviewPageSize}
        onRecordTitleChange={setRecordTitle}
        onClearError={() => { dispatch(setUploadError(null)); setPendingFile(null); }}
      />
      )}

      <RecordsList
        records={records}
        isRecordLoading={isRecordLoading}
        onSelect={handleSelectRecord}
        onDelete={(id) => dispatch(deleteRecord(id))}
        onRefresh={() => dispatch(fetchRecords())}
        onStatusChange={(id, status) => dispatch(updateRecordStatus(id, status))}
        onNotesChange={(id, notes) => dispatch(updateRecordNotes(id, notes))}
        canWrite={canWrite}
      />

      {pdfPasswordState && (
        <Suspense fallback={null}>
          <PdfPasswordModal isWrongPassword={pdfPasswordState.isWrongPassword} onSubmit={handlePasswordSubmit} onCancel={handlePasswordCancel} />
        </Suspense>
      )}
    </div>
  );
}
