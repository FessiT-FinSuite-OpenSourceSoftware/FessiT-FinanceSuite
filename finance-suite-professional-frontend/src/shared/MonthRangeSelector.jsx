import React from "react";
import { Calendar, ArrowRight, X } from "lucide-react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function MonthRangeSelector({
  from = "",
  to = "",
  onChange,
  // I removed the label by default to fix your flex alignment, 
  // but you can pass it back in if you wrap everything in a taller container.
  label = "", 
}) {
  const normalize = (nextFrom, nextTo) => {
    if (!nextFrom || !nextTo) return { from: nextFrom, to: nextTo };
    return nextFrom <= nextTo
      ? { from: nextFrom, to: nextTo }
      : { from: nextTo, to: nextFrom };
  };

  // Helper to cleanly format "2024-05" into "May 2024"
  const formatDisplay = (val) => {
    if (!val) return null;
    const [year, month] = val.split("-");
    return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ml-1">
          {label}
        </span>
      )}

      {/* Matches standard form control heights (h-10).
        Adjust rounded-md to rounded-lg if your other inputs are rounder.
      */}
      <div
        className="
          flex items-center w-fit h-10
          bg-white border border-slate-300 
          rounded-md shadow-sm 
          transition-all duration-200
          focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500
        "
      >
        {/* FROM BLOCK */}
        <div className="relative flex items-center h-full min-w-[120px]">
          <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          
          {/* Custom Display UI - Unaffected by browser quirks */}
          <span className={`absolute left-9 text-sm pointer-events-none ${from ? "text-slate-700" : "text-slate-400"}`}>
            {formatDisplay(from) || "Start"}
          </span>

          {/* Invisible Native Input Overlay */}
          <input
            type="month"
            value={from}
            onClick={(e) => e.currentTarget.showPicker()}
            onChange={(e) => onChange(normalize(e.target.value, to))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* SEPARATOR */}
        <div className="flex items-center justify-center px-2 text-slate-300 pointer-events-none">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>

        {/* TO BLOCK */}
        <div className="relative flex items-center h-full min-w-[120px]">
          <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          
          {/* Custom Display UI */}
          <span className={`absolute left-9 text-sm pointer-events-none ${to ? "text-slate-700" : "text-slate-400"}`}>
            {formatDisplay(to) || "End"}
          </span>

          {/* Invisible Native Input Overlay */}
          <input
            type="month"
            value={to}
            onClick={(e) => e.currentTarget.showPicker()}
            onChange={(e) => onChange(normalize(from, e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* RESET BUTTON */}
        {(from || to) && (
          <button
            type="button"
            onClick={() => onChange({ from: "", to: "" })}
            className="
              h-full px-2.5 flex items-center justify-center 
              border-l border-slate-200 
              text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-r-md
              transition-colors z-10
            "
            title="Clear dates"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}