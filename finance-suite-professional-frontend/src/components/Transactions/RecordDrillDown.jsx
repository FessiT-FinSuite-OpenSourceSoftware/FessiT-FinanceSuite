import React, { useMemo, useRef, useCallback } from "react";
import { ArrowLeft, FileText, RefreshCw, PenLine, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { saveBytes, showDownloadNotification } from "../../utils/pdfUtils";
import { StatCard, TabActionBar, FilterSelect, Pagination, DataTable } from "../../shared/ui";
import { TRANSACTION_CATEGORIES } from "./constants";
import { fmt, fmtDate, getTransactionType } from "./helpers";
import { SavedRowWrapper, buildTxnColumns, renderTxnExpanded } from "./SavedRow";

export default function RecordDrillDown({
  title, entries, total, isLoading,
  search, typeFilter, txnCategoryFilter, periodFilter, customFrom, customTo,
  currentPage, pageSize,
  dispatch, setDeleteConfirm,
  onBack, onRefresh, onAddManually,
  onSearchChange, onTypeChange, onTxnCategoryChange, onPeriodChange,
  onCustomFromChange, onCustomToChange,
  onPageChange, onPageSizeChange,
  canWrite = true,
}) {
  // Shared map: rowId → live state object (populated by SavedRowWrapper via onRegister)
  const stateMap = useRef({});

  const onRegister = useCallback((id, state) => {
    stateMap.current[id] = state;
  }, []);

  // entries are already paginated/filtered by backend — compute stats from current page
  const { totalCredits, totalDebits, debtTaken, debtRepaid } = useMemo(() => {
    let credits = 0, debits = 0, debtTaken = 0, debtRepaid = 0;
    for (const t of entries) {
      const type   = getTransactionType(t);
      const credit = t.credit != null && t.credit !== "" ? parseFloat(t.credit) : null;
      const debit  = t.debit  != null && t.debit  !== "" ? parseFloat(t.debit)  : null;
      if (type === "Credit") credits += credit ?? (parseFloat(t.amount) || 0);
      else                   debits  += debit  ?? (parseFloat(t.amount) || 0);
      const txnCat = t.transaction_category ?? "General";
      const amt = (debit ?? credit ?? parseFloat(t.amount) ?? 0);
      if (txnCat === "Debt Taken")  debtTaken  += amt;
      if (txnCat === "Debt Repaid") debtRepaid += amt;
    }
    return { totalCredits: credits, totalDebits: debits, debtTaken, debtRepaid };
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil((total ?? entries.length) / pageSize));
  const netFlow    = totalCredits - totalDebits;
  const netDebt    = debtTaken - debtRepaid;

  const handleExport = async () => {
    const toastId = toast.loading("Preparing Excel export…");
    try {
      const rows = entries.map((t) => {
        const type  = getTransactionType(t);
        const debit  = t.debit  != null && t.debit  !== "" ? parseFloat(t.debit)  : (type === "Debit"  ? parseFloat(t.amount) || "" : "");
        const credit = t.credit != null && t.credit !== "" ? parseFloat(t.credit) : (type === "Credit" ? parseFloat(t.amount) || "" : "");
        return {
          Date:                   fmtDate(t.date),
          Reference:              t.reference ?? "",
          Narration:              t.narration ?? t.description ?? "",
          Debit:                  debit,
          Credit:                 credit,
          Balance:                t.balance != null ? parseFloat(t.balance) : "",
          Notes:                  t.notes ?? "",
          Status:                 t.status ?? "",
          "Transaction Category": t.transaction_category || "General",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [10, 18, 40, 14, 14, 14, 30, 12, 22].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      const fileName = `${title || "transactions"}.xlsx`;
      const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      toast.dismiss(toastId);
      const filePath = await saveBytes(new Uint8Array(bytes), fileName);
      await showDownloadNotification(fileName, filePath);
    } catch (err) {
      toast.update(toastId, { render: `Export failed: ${err.message}`, type: "error", isLoading: false, autoClose: 4000 });
    }
  };

  // Stable columns — reads live state from stateMap ref at render time
  const columns = useMemo(() => buildTxnColumns(stateMap, canWrite, dispatch), [canWrite, dispatch]); // eslint-disable-line

  const countLabel = total ?? entries.length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">{countLabel} transaction{countLabel !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
          <button onClick={onAddManually} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <PenLine className="w-3.5 h-3.5" /> Add Manually
          </button>
          )}
          <button onClick={handleExport} disabled={entries.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button onClick={onRefresh} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Transactions" value={isLoading ? "…" : countLabel} />
        <StatCard label="Total Credits" value={isLoading ? "…" : fmt(totalCredits)} valueClass="text-green-600 dark:text-green-400" />
        <StatCard label="Total Debits"  value={isLoading ? "…" : fmt(totalDebits)}  valueClass="text-red-600 dark:text-red-400" />
       <StatCard
          label="Net Debt"
          value={isLoading ? "…" : fmt(netDebt)}
          valueClass={netDebt > 0 ? "text-orange-600 dark:text-orange-400" : netDebt < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-slate-200"}
          // subtext={isLoading ? undefined : `↑ ${fmt(debtTaken)}  ↓ ${fmt(debtRepaid)}`}
        />
        <StatCard label="Net Balance"   value={isLoading ? "…" : fmt(netFlow)}      valueClass={netFlow >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-red-600 dark:text-red-400"} />
        
      </div>

      {/* Filter Bar */}
      <TabActionBar searchValue={search} onSearchChange={onSearchChange} searchPlaceholder="Search description, reference…">
        <FilterSelect value={periodFilter} onChange={onPeriodChange}>
          <option value="all">All Time</option>
          <option value="current_month">Current Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_3">Last 3 Months</option>
          <option value="last_6">Last 6 Months</option>
          <option value="this_year">This Year</option>
          <option value="custom">Custom Range</option>
        </FilterSelect>
        {periodFilter === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-700 dark:text-slate-200 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-xs text-gray-400 dark:text-slate-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-700 dark:text-slate-200 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </>
        )}
        <FilterSelect value={typeFilter} onChange={onTypeChange}>
          <option value="">All Types</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </FilterSelect>
        <FilterSelect value={txnCategoryFilter} onChange={onTxnCategoryChange}>
          <option value="">All Categories</option>
          {TRANSACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
      </TabActionBar>

      {/*
        SavedRowWrappers hold per-row state and register it into stateMap.
        They render only their modals (portaled to body) — no DOM output in the table.
        Must render before DataTable so stateMap is populated on first paint.
      */}
      {entries.map((row) => {
        const id = row._id?.$oid || row._id || row.id;
        return (
          <SavedRowWrapper
            key={id}
            row={row}
            id={id}
            dispatch={dispatch}
            setDeleteConfirm={setDeleteConfirm}
            onRegister={onRegister}
            canWrite={canWrite}
          />
        );
      })}

      {/* Table — Assets-style expand with animated ExpandedRow from DataTable */}
      <DataTable
        isLoading={isLoading}
        data={entries}
        rowKey={(row) => row._id?.$oid || row._id || row.id}
        columns={columns}
        wrapperClass="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm"
        tbodyClass="divide-y divide-slate-200 dark:divide-slate-800"
        emptyMessage={entries.length === 0 ? "No transactions in this record" : "No transactions match your filters"}
        renderExpanded={(row) => renderTxnExpanded(row, stateMap, canWrite)}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={countLabel}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
