import React from "react";
import { Receipt, IndianRupee } from "lucide-react";

export default function ComplaincesAlert() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Receipt className="text-orange-600" size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-1">
                GST Filing Due
              </h4>
              <p className="text-sm text-orange-700 mb-3">
                GSTR-3B for September 2024 is due on 20th October 2024
              </p>
              <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
                File Now →
              </button>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IndianRupee className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">
                TDS Return Ready
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Quarterly TDS return for Q2 FY 2024-25 is ready to file
              </p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Review Return →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
