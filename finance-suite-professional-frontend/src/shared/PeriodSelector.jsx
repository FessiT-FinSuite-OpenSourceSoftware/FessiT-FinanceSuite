import React, { useState, useEffect } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Indian FY: Apr(4) – Mar(3). Returns start calendar year of FY.
function getFYStart(date) {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

// FY months in order: Apr=4..Dec=12, Jan=1..Mar=3
function fyMonths(fyStart) {
  const months = [];
  for (let m = 4; m <= 12; m++) months.push({ year: fyStart, month: m });
  for (let m = 1; m <= 3; m++)  months.push({ year: fyStart + 1, month: m });
  return months;
}

// Clamp a {year,month} to be within the given FY
function clampToFY(year, month, fyStart) {
  const all = fyMonths(fyStart);
  const first = all[0];
  const last  = all[all.length - 1];
  const toIdx = (y, m) => y * 12 + m;
  if (toIdx(year, month) < toIdx(first.year, first.month)) return first;
  if (toIdx(year, month) > toIdx(last.year,  last.month))  return last;
  return { year, month };
}

// Returns array of {year,month} from start to end inclusive (within same FY)
function monthRange(fromY, fromM, toY, toM) {
  const result = [];
  let y = fromY, m = fromM;
  while (y * 12 + m <= toY * 12 + toM) {
    result.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

const PRESETS_CURRENT = [
  { label: "Current Month",    key: "this_month" },
  { label: "Previous Month",    key: "last_month" },
  { label: "Last 3 Months", key: "last_3" },
  { label: "Last 6 Months", key: "last_6" },
  { label: "Last 1 Year",   key: "last_12" },
  { label: "Custom",        key: "custom" },
];

const PRESETS_PAST = [
  { label: "Quarter 1 (Apr–Jun)", key: "past_q1" },
  { label: "Quarter 2 (Jul–Sep)", key: "past_q2" },
  { label: "Quarter 3 (Oct–Dec)", key: "past_q3" },
  { label: "Quarter 4 (Jan–Mar)", key: "past_q4" },
  { label: "Custom Date Range",   key: "custom" },
];

/**
 * PeriodSelector
 *
 * Props:
 *   onChange(months: Array<{year, month}>)  — called with the selected month(s)
 *
 * Single-month mode (legacy): if you only need one month, read months[0].
 */
export default function PeriodSelector({ onChange }) {
  const now = new Date();
  const currentFYStart = getFYStart(now);

  const [fyStart, setFYStart]       = useState(currentFYStart);
  const [preset, setPreset]         = useState("this_month");
  const [customFrom, setCustomFrom] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [customTo,   setCustomTo]   = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  // FY options: last 5 FYs including current
  const fyOptions = [];
  for (let y = currentFYStart - 4; y <= currentFYStart; y++) fyOptions.push(y);

  const isPastFY = fyStart < currentFYStart;
  const PRESETS = isPastFY ? PRESETS_PAST : PRESETS_CURRENT;

  // How many months of the selected FY have elapsed up to today
  const nowIdx = now.getFullYear() * 12 + now.getMonth() + 1;
  const elapsedInFY = fyMonths(fyStart).filter(({ year, month }) => year * 12 + month <= nowIdx).length;

  const disabledPresets = isPastFY ? new Set() : new Set(
    elapsedInFY < 2  ? ["last_month", "last_3", "last_6", "last_12"] :
    elapsedInFY < 3  ? ["last_3", "last_6", "last_12"] :
    elapsedInFY < 6  ? ["last_6", "last_12"] :
    elapsedInFY < 12 ? ["last_12"] : []
  );

  // Fall back to this_month if current preset becomes disabled
  useEffect(() => {
    if (disabledPresets.has(preset)) setPreset("this_month");
  }, [fyStart]); // eslint-disable-line

  function resolvePreset(p, fy) {
    const all = fyMonths(fy);
    const nowIdx = now.getFullYear() * 12 + now.getMonth() + 1;
    const available = all.filter(({ year, month }) => year * 12 + month <= nowIdx);
    if (available.length === 0) return [all[0]];
    const last = available[available.length - 1];

    if (p === "this_month") return [clampToFY(now.getFullYear(), now.getMonth() + 1, fy)];
    if (p === "last_month") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return [clampToFY(d.getFullYear(), d.getMonth() + 1, fy)];
    }
    if (p === "last_3")  return available.slice(-3).length  ? available.slice(-3)  : [last];
    if (p === "last_6")  return available.slice(-6).length  ? available.slice(-6)  : [last];
    if (p === "last_12") return available;

    // past FY presets — quarters relative to FY start (Apr)
    if (p === "past_q1") return monthRange(fy, 4, fy, 6);       // Apr–Jun
    if (p === "past_q2") return monthRange(fy, 7, fy, 9);       // Jul–Sep
    if (p === "past_q3") return monthRange(fy, 10, fy, 12);     // Oct–Dec
    if (p === "past_q4") return monthRange(fy + 1, 1, fy + 1, 3); // Jan–Mar

    return null;
  }

  function emit(p, fy, from, to) {
    if (p === "custom") {
      const cFrom = clampToFY(from.year, from.month, fy);
      const cTo   = clampToFY(to.year,   to.month,   fy);
      // ensure from <= to
      const fromIdx = cFrom.year * 12 + cFrom.month;
      const toIdx   = cTo.year   * 12 + cTo.month;
      const range = fromIdx <= toIdx
        ? monthRange(cFrom.year, cFrom.month, cTo.year, cTo.month)
        : [cFrom];
      onChange(range);
    } else {
      const months = resolvePreset(p, fy);
      if (months) onChange(months);
    }
  }

  // Emit on mount and whenever selection changes
  useEffect(() => {
    emit(preset, fyStart, customFrom, customTo);
  }, [preset, fyStart, customFrom, customTo]); // eslint-disable-line

  function handleFYChange(newFY) {
    setFYStart(newFY);
    setPreset(newFY < currentFYStart ? "past_q1" : "this_month");
    const cf = clampToFY(customFrom.year, customFrom.month, newFY);
    const ct = clampToFY(customTo.year,   customTo.month,   newFY);
    setCustomFrom(cf);
    setCustomTo(ct);
  }

  function handleCustomFrom(year, month) {
    const clamped = clampToFY(year, month, fyStart);
    setCustomFrom(clamped);
    // if from > to, push to forward
    if (clamped.year * 12 + clamped.month > customTo.year * 12 + customTo.month) {
      setCustomTo(clamped);
    }
  }

  function handleCustomTo(year, month) {
    const clamped = clampToFY(year, month, fyStart);
    setCustomTo(clamped);
    // if to < from, pull from back
    if (clamped.year * 12 + clamped.month < customFrom.year * 12 + customFrom.month) {
      setCustomFrom(clamped);
    }
  }

  function handleReset() {
    setFYStart(currentFYStart);
    setPreset("this_month");
    setCustomFrom({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setCustomTo({ year: now.getFullYear(), month: now.getMonth() + 1 });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">

      {/* FY pill */}
      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        <span className="text-xs text-gray-400 font-medium">FY</span>
        <select
          value={fyStart}
          onChange={(e) => handleFYChange(Number(e.target.value))}
          className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
        >
          {fyOptions.map((y) => (
            <option key={y} value={y}>FY {y}-{String(y + 1).slice(-2)}</option>
          ))}
        </select>
      </div>

      <span className="text-gray-300">|</span>

      {/* Period pill */}
      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        <span className="text-xs text-gray-400 font-medium">Period</span>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
        >
          {PRESETS.filter(p => !disabledPresets.has(p.key)).map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Custom pickers — appear inline */}
      {preset === "custom" && (
        <>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-medium">From</span>
            <MonthPicker value={customFrom} fyStart={fyStart} onChange={({ year, month }) => handleCustomFrom(year, month)} maxValue={customTo} />
          </div>
          <span className="text-xs text-gray-400">→</span>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-medium">To</span>
            <MonthPicker value={customTo} fyStart={fyStart} onChange={({ year, month }) => handleCustomTo(year, month)} minValue={customFrom} />
          </div>
        </>
      )}

      {/* Active range badge */}
      {preset !== "custom" && (
        <ActiveBadge preset={preset} fyStart={fyStart} now={now} />
      )}
      </div>

      {/* Reset to default — right corner */}
      {(fyStart !== currentFYStart || preset !== "this_month") && (
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-300 bg-gray-50 hover:bg-red-50 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-all"
          title="Reset to default"
        >
          ↺ Reset
        </button>
      )}
    </div>
  );
}

function MonthPicker({ value, fyStart, onChange, minValue, maxValue }) {
  const allFYMonths = fyMonths(fyStart);

  function isDisabled(year, month) {
    const idx = year * 12 + month;
    if (minValue && idx < minValue.year * 12 + minValue.month) return true;
    if (maxValue && idx > maxValue.year * 12 + maxValue.month) return true;
    return false;
  }

  return (
    <select
      value={`${value.year}-${String(value.month).padStart(2, "0")}`}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map(Number);
        onChange({ year: y, month: m });
      }}
      className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
    >
      {allFYMonths.filter(({ year, month }) => !isDisabled(year, month)).map(({ year, month }) => (
        <option
          key={`${year}-${month}`}
          value={`${year}-${String(month).padStart(2, "0")}`}
          disabled={isDisabled(year, month)}
        >
          {MONTHS[month - 1]} {year}
        </option>
      ))}
    </select>
  );
}

function ActiveBadge({ preset, fyStart, now }) {
  const all = fyMonths(fyStart);
  const nowIdx = now.getFullYear() * 12 + now.getMonth() + 1;
  const available = all.filter(({ year, month }) => year * 12 + month <= nowIdx);

  let label = "";
  if (preset === "this_month") {
    label = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  } else if (preset === "last_month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } else if (preset === "last_3") {
    const s = available.slice(-3);
    if (s.length) label = `${MONTHS[s[0].month-1]} ${s[0].year} – ${MONTHS[s[s.length-1].month-1]} ${s[s.length-1].year}`;
  } else if (preset === "last_6") {
    const s = available.slice(-6);
    if (s.length) label = `${MONTHS[s[0].month-1]} ${s[0].year} – ${MONTHS[s[s.length-1].month-1]} ${s[s.length-1].year}`;
  } else if (preset === "last_12") {
    if (available.length) label = `${MONTHS[available[0].month-1]} ${available[0].year} – ${MONTHS[available[available.length-1].month-1]} ${available[available.length-1].year}`;
  } else if (preset === "past_q1") { label = `Apr – Jun ${fyStart}`; }
  else if (preset === "past_q2")   { label = `Jul – Sep ${fyStart}`; }
  else if (preset === "past_q3")   { label = `Oct – Dec ${fyStart}`; }
  else if (preset === "past_q4")   { label = `Jan – Mar ${fyStart + 1}`; }

  if (!label) return null;
  return (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 whitespace-nowrap">
      {label}
    </span>
  );
}
