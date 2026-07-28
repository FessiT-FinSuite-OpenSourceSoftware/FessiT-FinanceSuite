import React, { useMemo } from "react";
import { ArrowLeft, FileText, RefreshCw, PenLine } from "lucide-react";
import { StatCard, TabActionBar, FilterSelect, Pagination, TableWrapper, TableHead } from "../../shared/ui";
import { SAVED_COLS, TRANSACTION_CATEGORIES } from "./constants";
import { fmt, getTransactionType } from "./helpers";
import { SavedRowWrapper } from "./SavedRow";

export default function RecordDrillDown({
  title, entries, isLoading,
  search, typeFilter, categoryFilter, txnCategoryFilter,
  currentPage, pageSize,
  dispatch, setDeleteConfirm,
  onBack, onRefresh, onAddManually,
  onSearchChange, onTypeChange, onCategoryChange, onTxnCategoryChange,
  onPageChange, onPageSizeChange,
}) {
  const categories = useMemo(() =>
    ["All", ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort()],
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((t) => {
      if (typeFilter !== "All" && getTransactionType(t) !== typeFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (txnCategoryFilter !== "All" && (t.transaction_category || "General") !== txnCategoryFilter) return false;
      const narration = (t.narration ?? t.description ?? "").toLowerCase();
      const reference = (t.reference ?? "").toLowerCase();
      if (q && !narration.includes(q) && !reference.includes(q)) return false;
      return true;
    });
  }, [entries, search, typeFilter, categoryFilter, txnCategoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const { totalCredits, totalDebits } = useMemo(() => {
    let credits = 0, debits = 0;
    for (const t of filtered) {
      const type   = getTransactionType(t);
      const credit = t.credit != null && t.credit !== "" ? parseFloat(t.credit) : null;
      const debit  = t.debit  != null && t.debit  !== "" ? parseFloat(t.debit)  : null;
      if (type === "Credit") credits += credit ?? (parseFloat(t.amount) || 0);
      else                   debits  += debit  ?? (parseFloat(t.amount) || 0);
    }
    return { totalCredits: credits, totalDebits: debits };
  }, [filtered]);

  const netFlow = totalCredits - totalDebits;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddManually} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <PenLine className="w-3.5 h-3.5" /> Add Manually
          </button>
          <button onClick={onRefresh} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={isLoading ? "…" : filtered.length} />
        <StatCard label="Total Credits" value={isLoading ? "…" : fmt(totalCredits)} valueClass="text-green-600 dark:text-green-400" /> 
        <StatCard label="Total Debits"  value={isLoading ? "…" : fmt(totalDebits)}  valueClass="text-red-600 dark:text-red-400" />
        <StatCard label="Net Flow" value={isLoading ? "…" : fmt(netFlow)} valueClass={netFlow >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-red-600 dark:text-red-400"} />
      </div>

      {/* Filter Bar */}
      <TabActionBar searchValue={search} onSearchChange={onSearchChange} searchPlaceholder="Search description, reference…">
        <FilterSelect value={typeFilter} onChange={onTypeChange}>
          <option value="All">All Types</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </FilterSelect>
        <FilterSelect value={categoryFilter} onChange={onCategoryChange}>
          {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </FilterSelect>
        <FilterSelect value={txnCategoryFilter} onChange={onTxnCategoryChange}>
          <option value="All">All Types</option>
          {TRANSACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
      </TabActionBar>

      {/* Table */}
      <TableWrapper>
        <TableHead columns={SAVED_COLS} />
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {isLoading ? (
            <tr><td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-slate-500">Loading…</td></tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-14 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
                  <FileText className="w-10 h-10 opacity-30" />
                  <p className="text-sm">{entries.length === 0 ? "No transactions in this record" : "No transactions match your filters"}</p>
                </div>
              </td>
            </tr>
          ) : paginated.map((row) => {
            const id = row._id?.$oid || row._id || row.id;
            return <SavedRowWrapper key={id} row={row} id={id} dispatch={dispatch} setDeleteConfirm={setDeleteConfirm} />;
          })}
        </tbody>
      </TableWrapper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
