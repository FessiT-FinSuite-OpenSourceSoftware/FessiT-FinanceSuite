import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  transactionsSelector, fetchByRecord, fetchRecords,
  deleteTransaction, saveExtracted,
} from "../ReduxApi/transactions";
import { authSelector } from "../ReduxApi/auth";
import { canWrite as checkCanWrite, Module } from "../utils/permissions";
import { ConfirmModal } from "../shared/ui";
import RecordDrillDown from "../components/Transactions/RecordDrillDown";

const AddTransactionModal = lazy(() => import("../components/Transactions/AddTransactionModal"));

export default function TransactionsDrillDownPage() {
  const { recordId } = useParams();
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const { isLoading, isSaving, entries, records } = useSelector(transactionsSelector);
  const { user } = useSelector(authSelector);
  const canWrite = checkCanWrite(user, Module.Transactions);

  const record = records.find((r) => r.id === recordId);

  const [search,             setSearch]             = useState("");
  const [typeFilter,         setTypeFilter]         = useState("All");
  const [categoryFilter,     setCategoryFilter]     = useState("All");
  const [txnCategoryFilter,  setTxnCategoryFilter]  = useState("All");
  const [currentPage,        setCurrentPage]        = useState(1);
  const [pageSize,       setPageSize]       = useState(10);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [showAddModal,   setShowAddModal]   = useState(false);

  useEffect(() => {
    if (!records.length) dispatch(fetchRecords());
    dispatch(fetchByRecord(recordId));
  }, [recordId]); // eslint-disable-line

  const handleAddManualSave = useCallback(async (rows) => {
    const saved = await dispatch(saveExtracted(rows, record?.title ?? ""));
    if (saved) { setShowAddModal(false); dispatch(fetchByRecord(recordId)); }
  }, [dispatch, record, recordId]);

  return (
    <div className="w-full space-y-4">
      <RecordDrillDown
        title={record?.title ?? recordId}
        entries={entries}
        isLoading={isLoading}
        search={search}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        txnCategoryFilter={txnCategoryFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        dispatch={dispatch}
        setDeleteConfirm={setDeleteConfirm}
        onBack={() => navigate("/transactions")}
        onRefresh={() => dispatch(fetchByRecord(recordId))}
        onAddManually={() => setShowAddModal(true)}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        onTypeChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
        onCategoryChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
        onTxnCategoryChange={(v) => { setTxnCategoryFilter(v); setCurrentPage(1); }}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
        canWrite={canWrite}
      />

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Transaction"
          message="This transaction will be permanently deleted. This cannot be undone."
          onConfirm={() => { dispatch(deleteTransaction(deleteConfirm)); setDeleteConfirm(null); }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {showAddModal && (
        <Suspense fallback={null}>
          <AddTransactionModal isSaving={isSaving} onClose={() => setShowAddModal(false)} onSave={handleAddManualSave} />
        </Suspense>
      )}
    </div>
  );
}
