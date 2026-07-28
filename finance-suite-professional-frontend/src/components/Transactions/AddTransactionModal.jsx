import React, { useState } from "react";
import { X, Check, RefreshCw } from "lucide-react";
import { inputCls, EMPTY_MANUAL } from "./constants";

export default function AddTransactionModal({ onSave, onClose, isSaving }) {
  const [form, setForm] = useState(EMPTY_MANUAL());
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const valid = form.narration.trim() && (form.debit || form.credit);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const debit   = form.debit   === "" ? null : parseFloat(form.debit);
    const credit  = form.credit  === "" ? null : parseFloat(form.credit);
    const balance = form.balance === "" ? null : parseFloat(form.balance);
    onSave([{
      date:        form.date,
      narration:   form.narration.trim(),
      description: form.narration.trim(),
      reference:   form.reference.trim(),
      category:    form.category.trim(),
      debit, credit, balance,
      amount: debit ?? credit ?? 0,
      type: debit != null ? "Debit" : "Credit",
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Add Transaction</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={set("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Reference</label>
              <input type="text" value={form.reference} onChange={set("reference")} placeholder="Ref / Cheque no." className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Narration <span className="text-red-400">*</span>
            </label>
            <input type="text" value={form.narration} onChange={set("narration")} placeholder="Transaction description" className={inputCls} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Debit</label>
              <input type="number" step="0.01" min="0" value={form.debit} onChange={set("debit")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Credit</label>
              <input type="number" step="0.01" min="0" value={form.credit} onChange={set("credit")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Balance</label>
              <input type="number" step="0.01" value={form.balance} onChange={set("balance")} placeholder="0.00" className={inputCls + " text-right"} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Category</label>
            <input type="text" value={form.category} onChange={set("category")} placeholder="e.g. Salary, Rent…" className={inputCls} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!valid || isSaving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
