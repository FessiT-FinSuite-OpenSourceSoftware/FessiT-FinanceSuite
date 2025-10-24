import React from "react";
import { Plus, Download } from "lucide-react";

export default function QuickActions() {
  return (
    <div>
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <Plus className="text-indigo-600 mb-2" size={24} />
            <span className="text-sm font-medium text-gray-700">
              New Invoice
            </span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <Plus className="text-indigo-600 mb-2" size={24} />
            <span className="text-sm font-medium text-gray-700">
              Add Customer
            </span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <Plus className="text-indigo-600 mb-2" size={24} />
            <span className="text-sm font-medium text-gray-700">
              Purchase Order
            </span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
            <Download className="text-indigo-600 mb-2" size={24} />
            <span className="text-sm font-medium text-gray-700">
              GST Return
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
