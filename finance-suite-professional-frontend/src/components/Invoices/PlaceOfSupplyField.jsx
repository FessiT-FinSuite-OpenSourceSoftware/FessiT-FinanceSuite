import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";

export const GST_PLACE_OF_SUPPLY_OPTIONS = [
  "Jammu & Kashmir-01",
  "Himachal Pradesh-02",
  "Punjab-03",
  "Chandigarh-04",
  "Uttarakhand-05",
  "Haryana-06",
  "Delhi-07",
  "Rajasthan-08",
  "Uttar Pradesh-09",
  "Bihar-10",
  "Sikkim-11",
  "Arunachal Pradesh-12",
  "Nagaland-13",
  "Manipur-14",
  "Mizoram-15",
  "Tripura-16",
  "Meghalaya-17",
  "Assam-18",
  "West Bengal-19",
  "Jharkhand-20",
  "Odisha-21",
  "Chhattisgarh-22",
  "Madhya Pradesh-23",
  "Gujarat-24",
  "Daman & Diu-25",
  "Dadra & Nagar Haveli-26",
  "Maharashtra-27",
  "Andhra Pradesh (Old)-28",
  "Karnataka-29",
  "Goa-30",
  "Lakshadweep-31",
  "Kerala-32",
  "Tamil Nadu-33",
  "Puducherry-34",
  "Andaman & Nicobar Islands-35",
  "Telangana-36",
  "Andhra Pradesh (New)-37",
  "Ladakh-38",
];

export default function PlaceOfSupplyField({
  value,
  onChange,
  error,
  labelClassName = "block text-sm font-semibold text-gray-700 mb-1",
  inputClassName = "border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400",
  errorClassName = "absolute text-[13px] text-[#f10404]",
}) {
  const normalizedValue = value || "";
  const wrapperRef = useRef(null);
  const presetValues = useMemo(() => new Set(GST_PLACE_OF_SUPPLY_OPTIONS), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isOther, setIsOther] = useState(
    Boolean(normalizedValue && !presetValues.has(normalizedValue))
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GST_PLACE_OF_SUPPLY_OPTIONS;

    return GST_PLACE_OF_SUPPLY_OPTIONS.filter((option) =>
      option.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (normalizedValue && !presetValues.has(normalizedValue)) {
      setIsOther(true);
    } else if (presetValues.has(normalizedValue)) {
      setIsOther(false);
    }
  }, [normalizedValue, presetValues]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const updateValue = (nextValue) => {
    onChange({
      target: {
        name: "place_of_supply",
        value: nextValue,
      },
    });
  };

  const selectOption = (nextValue) => {
    setIsOther(false);
    setOpen(false);
    setQuery("");
    updateValue(nextValue);
  };

  const selectOther = () => {
    setIsOther(true);
    setOpen(false);
    setQuery("");
    updateValue("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className={labelClassName}>Place of Supply *</label>
      {isOther ? (
        <div className="relative">
          <input
            type="text"
            name="place_of_supply"
            value={normalizedValue}
            onChange={onChange}
            placeholder="Type custom place of supply"
            className={`${inputClassName} pr-9`}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setIsOther(false);
              updateValue("");
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Choose from list"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          name="place_of_supply"
          onClick={() => setOpen((current) => !current)}
          className={`${inputClassName} flex items-center justify-between gap-2 bg-white text-left`}
        >
          <span className={`min-w-0 truncate ${normalizedValue ? "text-gray-700" : "text-gray-400"}`}>
            {normalizedValue || "Select place of supply"}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {open && !isOther && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state or code"
              className="min-w-0 flex-1 border-0 p-0 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    normalizedValue === option ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 truncate">{option}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-gray-500">No matching state code</p>
            )}

            <button
              type="button"
              onClick={selectOther}
              className={`flex w-full items-center justify-between border-t border-gray-100 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 ${
                isOther ? "text-blue-700" : "text-gray-700"
              }`}
            >
              <span>Other</span>
              <span className="text-xs font-normal text-gray-400">Type manually</span>
            </button>
          </div>
        </div>
      )}

      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
}
