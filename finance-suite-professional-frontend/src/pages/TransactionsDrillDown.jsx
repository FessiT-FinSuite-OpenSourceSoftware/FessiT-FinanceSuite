import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
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

function periodToDates(period, customFrom, customTo) {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (period === "custom")        return { date_from: customFrom || undefined, date_to: customTo || undefined };
  if (period === "current_month") return { date_from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),     date_to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  if (period === "last_month")    return { date_from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), date_to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (period === "last_3")        return { date_from: fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1)) };
  if (period === "last_6")        return { date_from: fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1)) };
  if (period === "this_year")     return { date_from: fmt(new Date(now.getFullYear(), 0, 1)) };
  return {};
}

export default function TransactionsDrillDownPage() {
  const { recordId } = useParams();
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const { isLoading, isSaving, entries, total, totals, records } = useSelector(transactionsSelector);
  const { user } = useSelector(authSelector);
  const canWrite = checkCanWrite(user, Module.Transactions);

  const record = records.find((r) => r.id === recordId);

  const [search,            setSearch]            = useState("");
  const [typeFilter,        setTypeFilter]        = useState("");
  const [txnCategoryFilter, setTxnCategoryFilter] = useState("");
  const [periodFilter,      setPeriodFilter]      = useState("all");
  const [customFrom,        setCustomFrom]        = useState("");
  const [customTo,          setCustomTo]          = useState("");
  const [currentPage,       setCurrentPage]       = useState(1);
  const [pageSize,          setPageSize]          = useState(10);
  const [deleteConfirm,     setDeleteConfirm]     = useState(null);
  const [showAddModal,      setShowAddModal]      = useState(false);
  const searchDebounce = useRef(null);

  // Always-fresh ref — updated every render so doFetch never reads stale state
  const stateRef = useRef({});
  stateRef.current = { search, typeFilter, txnCategoryFilter, periodFilter, customFrom, customTo, currentPage, pageSize };

  const doFetch = (overrides = {}) => {
    const s = { ...stateRef.current, ...overrides };
    const params = { page: s.currentPage, page_size: s.pageSize };
    if (s.search)            params.search       = s.search;
    if (s.typeFilter)        params.txn_type     = s.typeFilter;
    if (s.txnCategoryFilter) params.txn_category = s.txnCategoryFilter;
    const dates = periodToDates(s.periodFilter, s.customFrom, s.customTo);
    if (dates.date_from) params.date_from = dates.date_from;
    if (dates.date_to)   params.date_to   = dates.date_to;
    console.log("[doFetch] state=", s, "dates=", dates, "params=", params);
    dispatch(fetchByRecord(recordId, params));
  };

  useEffect(() => {
    if (!records.length) dispatch(fetchRecords());
    doFetch();
  }, [recordId]); // eslint-disable-line

  const handleAddManualSave = async (rows) => {
    const saved = await dispatch(saveExtracted(rows, record?.title ?? ""));
    if (saved) { setShowAddModal(false); doFetch(); }
  };

  return (
    <div className="w-full space-y-4">
      <RecordDrillDown
        title={record?.title ?? recordId}
        entries={entries}
        total={total}
        totals={totals}
        isLoading={isLoading}
        search={search}
        typeFilter={typeFilter}
        txnCategoryFilter={txnCategoryFilter}
        periodFilter={periodFilter}
        customFrom={customFrom}
        customTo={customTo}
        currentPage={currentPage}
        pageSize={pageSize}
        dispatch={dispatch}
        setDeleteConfirm={setDeleteConfirm}
        onBack={() => navigate("/transactions")}
        onRefresh={() => doFetch()}
        onAddManually={() => setShowAddModal(true)}
        onSearchChange={(v) => {
          setSearch(v);
          clearTimeout(searchDebounce.current);
          searchDebounce.current = setTimeout(() => {
            setCurrentPage(1);
            doFetch({ search: v, currentPage: 1 });
          }, 400);
        }}
        onTypeChange={(v) => {
          setTypeFilter(v); setCurrentPage(1);
          doFetch({ typeFilter: v, currentPage: 1 });
        }}
        onTxnCategoryChange={(v) => {
          setTxnCategoryFilter(v); setCurrentPage(1);
          doFetch({ txnCategoryFilter: v, currentPage: 1 });
        }}
        onPeriodChange={(v) => {
          setPeriodFilter(v); setCurrentPage(1);
          if (v !== "custom") doFetch({ periodFilter: v, currentPage: 1 });
          else { setCustomFrom(""); setCustomTo(""); doFetch({ periodFilter: "custom", customFrom: "", customTo: "", currentPage: 1 }); }
        }}
        onCustomFromChange={(v) => {
          setCustomFrom(v); setCurrentPage(1);
          doFetch({ periodFilter: "custom", customFrom: v, customTo: stateRef.current.customTo, currentPage: 1 });
        }}
        onCustomToChange={(v) => {
          setCustomTo(v); setCurrentPage(1);
          doFetch({ periodFilter: "custom", customFrom: stateRef.current.customFrom, customTo: v, currentPage: 1 });
        }}
        onPageChange={(p) => { setCurrentPage(p); doFetch({ currentPage: p }); }}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); doFetch({ pageSize: n, currentPage: 1 }); }}
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
