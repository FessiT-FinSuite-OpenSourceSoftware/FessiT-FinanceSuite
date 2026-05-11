import React, { useState } from "react";
import { Briefcase, Users, Gamepad2, ShoppingBag, ChevronDown, ChevronRight } from "lucide-react";
import { TDS_SECTION_GROUPS } from "../../utils/tdsData";

const ICONS = { 0: Briefcase, 1: Users, 2: Gamepad2, 3: ShoppingBag };
const COLUMNS = ["Code", "New Section (Act 2025)", "Nature of Payment", "Old Section (Act 1961)", "Rate"];

export default function TdsReferenceAccordion() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-lg font-bold text-gray-900 mb-3">TDS Section Reference (Income Tax Act, 2025)</p>
      {TDS_SECTION_GROUPS.map((sec, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={sec.group} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
                <span className="font-semibold text-gray-800">{sec.group}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-bold border bg-orange-50 border-orange-200 text-orange-700">
                {sec.rows.length} entries
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {COLUMNS.map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sec.rows.map((row) => (
                      <tr key={row.code} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-indigo-600">{row.code}</td>
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.newSection}</td>
                        <td className="px-4 py-2 text-gray-600">{row.nature}</td>
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.oldSection}</td>
                        <td className="px-4 py-2 font-semibold text-gray-800 whitespace-nowrap">{row.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
