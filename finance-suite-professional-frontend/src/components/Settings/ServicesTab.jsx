import React, { useState } from "react";
import { CirclePlus } from "lucide-react";
import { inputCls } from "../../shared/ui";

const emptyService = () => ({
  serviceName: "",
  serviceDescription: "",
  serviceAmount: "",
});

export default function ServicesTab({ services, onChange }) {
  const [errors, setErrors] = useState({});

  const handleChange = (idx, field, value) => {
    const updated = services.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    onChange(updated);

    if (errors[`${idx}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${idx}_${field}`];
        return next;
      });
    }
  };

  const addRow = () => onChange([...services, emptyService()]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
        Services & Offerings
      </h2>

      {services.length > 0 && (
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-8">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Service Name *
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((svc, idx) => (
              <tr key={svc.id || idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={svc.serviceName}
                    onChange={(e) =>
                      handleChange(idx, "serviceName", e.target.value)
                    }
                    className={`${inputCls} ${
                      errors[`${idx}_serviceName`] ? "border-red-400" : ""
                    }`}
                    placeholder="e.g. Web Development"
                  />
                  {errors[`${idx}_serviceName`] && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {errors[`${idx}_serviceName`]}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={svc.serviceDescription}
                    onChange={(e) =>
                      handleChange(idx, "serviceDescription", e.target.value)
                    }
                    className={inputCls}
                    placeholder="Brief description"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <CirclePlus size={16} />
        Add Service
      </button>
    </div>
  );
}
