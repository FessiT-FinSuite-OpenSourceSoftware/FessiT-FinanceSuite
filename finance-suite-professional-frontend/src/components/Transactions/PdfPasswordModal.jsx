import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputCls } from "./constants";

export default function PdfPasswordModal({ isWrongPassword, onSubmit, onCancel }) {
  const [value, setValue] = useState("");
  const [show, setShow]   = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => { e.preventDefault(); if (value) onSubmit(value); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">Password-Protected PDF</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          {isWrongPassword ? "Incorrect password, try again." : "This PDF is password-protected. Enter the password to continue."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="PDF password"
              autoComplete="off"
              className={`${inputCls} pr-8 ${isWrongPassword ? "border-red-400 dark:border-red-600" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!value} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
