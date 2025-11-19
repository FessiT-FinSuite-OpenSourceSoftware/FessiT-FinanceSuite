import React, { useEffect, useState } from "react";
import { CirclePlus, CircleMinus, ChevronDown, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";
import { useNavigate, useLocation } from "react-router-dom";
import { formatNumber } from "../../utils/formatNumber";
import { KeyUri, config } from "../../shared/key";

const initialInvoiceData = {
  invoice_type: "domestic", // "domestic" or "international"
  company_name: "",
  gstIN: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  lut_no: "",
  iec_no: "",
  invoice_number: "",
  invoice_date: "",
  invoice_dueDate: "",
  invoice_terms: "Due on receipt",
  po_number: "",
  po_date: "",
  place_of_supply: "",
  billcustomer_name: "",
  billcustomer_address: "",
  billcustomer_gstin: "",
  shipcustomer_name: "",
  shipcustomer_address: "",
  shipcustomer_gstin: "",
  subject: "",
  items: [
    {
      description: "",
      hours: "",
      rate: "",
      cgst: { cgstPercent: "", cgstAmount: "" },
      sgst: { sgstPercent: "", sgstAmount: "" },
      igst: { igstPercent: "", igstAmount: "" },
      itemTotal: "",
    },
  ],
  notes: "",
  subTotal: "",
  totalcgst: "",
  totalsgst: "",
  totaligst: "",
  total: "",
  status: "Draft",
};

export default function AddInvoice() {
  const location = useLocation();
  const nav = useNavigate();

  // ✅ Initialise invoice_type from query param or state
  const [invoiceData, setInvoiceData] = useState(() => {
    const params = new URLSearchParams(location.search);
    const typeFromQuery = params.get("type"); // "domestic" or "international"

    const normalizedType =
      typeFromQuery === "international" || typeFromQuery === "domestic"
        ? typeFromQuery
        : undefined;

    const invoiceType =
      normalizedType || location.state?.invoiceType || "domestic";

    return { ...initialInvoiceData, invoice_type: invoiceType };
  });

  const [inputErrors, setInputErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  const isDomestic = invoiceData.invoice_type === "domestic";
  const isInternational = invoiceData.invoice_type === "international";

  // ✅ Keep invoice_type in sync if URL changes (e.g., different query param)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeFromQuery = params.get("type");

    const normalizedType =
      typeFromQuery === "international" || typeFromQuery === "domestic"
        ? typeFromQuery
        : undefined;

    if (normalizedType && normalizedType !== invoiceData.invoice_type) {
      setInvoiceData((prev) => ({
        ...prev,
        invoice_type: normalizedType,
      }));
    }
  }, [location.search]);

  const groupTaxValues = (items = []) => {
    const grouped = { cgst: {}, sgst: {}, igst: {} };

    items.forEach((item) => {
      const hours = parseFloat(item.hours || 1);
      const rate = parseFloat(item.rate || 0);
      const baseAmount = hours * rate;

      if (isDomestic) {
        const cgstPercent = parseFloat(item.cgst?.cgstPercent || 0);
        const sgstPercent = parseFloat(item.sgst?.sgstPercent || 0);

        const cgstValue = (baseAmount * cgstPercent) / 100;
        const sgstValue = (baseAmount * sgstPercent) / 100;

        grouped.cgst[cgstPercent] =
          (grouped.cgst[cgstPercent] || 0) + cgstValue;
        grouped.sgst[sgstPercent] =
          (grouped.sgst[sgstPercent] || 0) + sgstValue;
      } else {
        const igstPercent = parseFloat(item.igst?.igstPercent || 0);
        const igstValue = (baseAmount * igstPercent) / 100;
        grouped.igst[igstPercent] =
          (grouped.igst[igstPercent] || 0) + igstValue;
      }
    });

    return grouped;
  };

  useEffect(() => {
    const subTotal = invoiceData.items.reduce(
      (sum, item) => sum + (parseFloat(item.itemTotal) || 0),
      0
    );

    const grouped = groupTaxValues(invoiceData.items);

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    if (isDomestic) {
      totalCgst = Object.values(grouped.cgst).reduce(
        (sum, val) => sum + val,
        0
      );
      totalSgst = Object.values(grouped.sgst).reduce(
        (sum, val) => sum + val,
        0
      );
    } else {
      totalIgst = Object.values(grouped.igst).reduce(
        (sum, val) => sum + val,
        0
      );
    }

    const total = subTotal + totalCgst + totalSgst + totalIgst;

    setInvoiceData((prev) => ({
      ...prev,
      subTotal: subTotal.toFixed(2),
      totalcgst: totalCgst.toFixed(2),
      totalsgst: totalSgst.toFixed(2),
      totaligst: totalIgst.toFixed(2),
      total: total.toFixed(2),
    }));
  }, [invoiceData.items, invoiceData.invoice_type]);

  const handleSelect = (e) => {
    const selected = countries.find((c) => c.code === e.target.value);
    setSelectedCountry(selected);
  };

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "company_name":
        if (value.length > 64)
          error = "Company name cannot exceed 64 characters.";
        else if (!/^[A-Za-z.\s]*$/.test(value))
          error = "Only alphabets, spaces and '.' are allowed.";
        break;

      case "company_phone":
        if (!value) {
          error = "Phone number is required.";
        } else if (!selectedCountry.phone.test(value)) {
          error = `Invalid phone number for ${selectedCountry.cname}.`;
        } else if (value.length > 15) {
          error = "Phone number cannot exceed 15 digits.";
        }
        break;

      case "company_email":
        if (value && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value))
          error = "Invalid email address.";
        break;

      case "gstIN":
        if (!/^[A-Za-z0-9]*$/.test(value))
          error = "GSTIN must be alphanumeric only.";
        else if (value.length > 15)
          error = "GSTIN should not exceed 15 characters.";
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({ ...invoiceData, [name]: value });
    validateField(name, value);

    if (inputErrors[name]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhoneChange = (e) => {
    let { name, value } = e.target;
    value = value.replace(/\D/g, "");
    setInvoiceData((prev) => ({ ...prev, company_phone: value }));
    validateField("company_phone", value);
    if (inputErrors[name]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...invoiceData.items];
    const item = updatedItems[index];

    if (
      [
        "hours",
        "rate",
        "cgstPercent",
        "cgstAmount",
        "sgstPercent",
        "sgstAmount",
        "igstPercent",
        "igstAmount",
        "itemTotal",
      ].includes(name)
    ) {
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        if (name.startsWith("cgst")) {
          item.cgst[name] = value;
        } else if (name.startsWith("sgst")) {
          item.sgst[name] = value;
        } else if (name.startsWith("igst")) {
          item.igst[name] = value;
        } else {
          item[name] = value;
        }
      }
    } else {
      item[name] = value;
    }

    const hours = parseFloat(item.hours) || 0;
    const rate = parseFloat(item.rate) || 0;
    const subTotal = hours * rate;

    let total = subTotal;

    if (isDomestic) {
      const cgstPercent = parseFloat(item.cgst.cgstPercent) || 0;
      const sgstPercent = parseFloat(item.sgst.sgstPercent) || 0;

      if (name === "cgstPercent") {
        item.cgst.cgstAmount = ((subTotal * cgstPercent) / 100).toFixed(2);
      }
      if (name === "sgstPercent") {
        item.sgst.sgstAmount = ((subTotal * sgstPercent) / 100).toFixed(2);
      }

      total =
        subTotal +
        (parseFloat(item.cgst.cgstAmount) || 0) +
        (parseFloat(item.sgst.sgstAmount) || 0);
    } else {
      const igstPercent = parseFloat(item.igst.igstPercent) || 0;

      if (name === "igstPercent") {
        item.igst.igstAmount = ((subTotal * igstPercent) / 100).toFixed(2);
      }

      total = subTotal + (parseFloat(item.igst.igstAmount) || 0);
    }

    item.itemTotal = total.toFixed(2);
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const addItem = () => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          hours: "",
          rate: "",
          cgst: { cgstPercent: "", cgstAmount: "" },
          sgst: { sgstPercent: "", sgstAmount: "" },
          igst: { igstPercent: "", igstAmount: "" },
          itemTotal: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const invoiceDataSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!invoiceData.company_name?.trim())
      newErrors.company_name = "Company name is required";
    if (!invoiceData.gstIN?.trim()) newErrors.gstIN = "GSTIN is required";
    if (!invoiceData.company_address?.trim())
      newErrors.company_address = "Address is required";
    if (!invoiceData.company_phone?.trim())
      newErrors.company_phone = "Phone number is required";
    if (!invoiceData.company_email?.trim())
      newErrors.company_email = "Email is required";

    // International specific validations
    if (isInternational) {
      if (!invoiceData.lut_no?.trim())
        newErrors.lut_no = "LUT No is required for international invoices";
      if (!invoiceData.iec_no?.trim())
        newErrors.iec_no = "IEC No is required for international invoices";
    }

    if (!invoiceData?.invoice_number?.trim())
      newErrors.invoice_number = "Invoice number is required";
    if (!invoiceData?.invoice_date?.trim())
      newErrors.invoice_date = "Invoice date is required";
    if (!invoiceData?.invoice_dueDate?.trim())
      newErrors.invoice_dueDate = "Invoice due date is required";
    if (!invoiceData?.po_number?.trim())
      newErrors.po_number = "P.O. No is required";
    if (!invoiceData?.po_date?.trim())
      newErrors.po_date = "P.O. Date is required";
    if (!invoiceData?.place_of_supply?.trim())
      newErrors.place_of_supply = "Place of supply is required";
    if (!invoiceData?.billcustomer_name?.trim())
      newErrors.billcustomer_name = "Customer name is required";
    if (!invoiceData?.billcustomer_address?.trim())
      newErrors.billcustomer_address = "Address is required";

    // GSTIN required only for domestic
    if (isDomestic && !invoiceData?.billcustomer_gstin?.trim())
      newErrors.billcustomer_gstin = "GSTIN required for domestic invoices";

    if (!invoiceData?.shipcustomer_name?.trim())
      newErrors.shipcustomer_name = "Customer name required";
    if (!invoiceData?.shipcustomer_address?.trim())
      newErrors.shipcustomer_address = "Address is required";

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    setInputErrors({});

    try {
      const res = await fetch(`${KeyUri.BACKENDURI}/invoices`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify(invoiceData),
      });

      if (!res.ok) throw new Error("Failed to create invoice");

      toast.success("Invoice created successfully");
      setInvoiceData(initialInvoiceData);
      nav("/invoices");
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || "Something went wrong while creating invoice"
      );
    }
  };

  const goBackToInvoices = () => {
    nav("/invoices");
  };

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="sticky top-[88px] w-full sm:w-[90%] md:w-full lg:w-full z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="">
          <div className="flex justify-between">
            <div className="px-4 py-2 flex items-center gap-3">
              <ArrowLeft
                strokeWidth={1}
                onClick={goBackToInvoices}
                className="cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  Invoice Type:
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isDomestic
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isDomestic ? "₹ Domestic" : "$ International"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-end mr-5 gap-2">
              <button
                className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={invoiceDataSubmit}
              >
                💾 Save
              </button>
              <button className="px-4 py-2 cursor-pointer bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto">
                ⬇️ Download
              </button>
              <button className="px-4 py-2 cursor-pointer bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto">
                🖨️ Print
              </button>
              <button className="px-4 py-2 cursor-pointer bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full sm:w-auto">
                ✉️ Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main form */}
      <div>
        <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
          {/* Organization Details */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Organization Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                className="border relative border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.company_name}
                name="company_name"
                placeholder="Enter company name"
                onChange={handleChange}
              />
              {inputErrors?.company_name && (
                <p className="absolute text-[13px] top-15 text-[#f10404]">
                  {inputErrors?.company_name}
                </p>
              )}
              {errors.company_name && (
                <p className="absolute text-red-500 text-[13px]">
                  {errors.company_name}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                GSTIN *
              </label>
              <input
                type="text"
                className="border reltive border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.gstIN}
                name="gstIN"
                placeholder="Enter GSTIN"
                onChange={handleChange}
                required
              />
              {inputErrors?.gstIN && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.gstIN}
                </p>
              )}
              {errors.gstIN && (
                <p className="absolute text-red-500 text-[13px]">
                  {errors.gstIN}
                </p>
              )}
            </div>
            <div className="col-span-2 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                placeholder="Enter company address"
                className="border relative border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-20 placeholder:text-gray-400"
                name="company_address"
                value={invoiceData.company_address}
                onChange={handleChange}
              />
              {inputErrors?.company_address && (
                <p className="absolute text-[13px] top-27 text-[#f10404]">
                  {inputErrors?.company_address}
                </p>
              )}
            </div>
            <div className="relative">
              <div className="relative flex flex-col w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone *
                </label>
                <div className="flex items-center">
                  <div className="flex items-center">
                    <select
                      onChange={handleSelect}
                      className="flex items-center gap-2 py-2 px-6 text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded-l-lg dark:text-gray-100 cursor-pointer appearance-none"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.cid} {country.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 -ml-6 text-gray-500 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter phone number"
                    className="border border-l-0 ml-2 border-gray-300 rounded-r-lg px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-gray-300"
                    onChange={handlePhoneChange}
                    value={invoiceData?.company_phone}
                    name="company_phone"
                  />
                </div>
              </div>
              {inputErrors?.company_phone && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.company_phone}
                </p>
              )}
              {errors?.company_phone && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {errors.company_phone}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                placeholder="Enter email"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.company_email}
                name="company_email"
                onChange={handleChange}
              />
              {inputErrors?.company_email && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.company_email}
                </p>
              )}
              {errors.company_email && (
                <p className="absolute text-red-500 text-[13px]">
                  {errors.company_email}
                </p>
              )}
            </div>

            {/* LUT No and IEC No - Only for International */}
            {isInternational && (
              <>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    LUT No *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter LUT No"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                    value={invoiceData.lut_no}
                    name="lut_no"
                    onChange={handleChange}
                  />
                  {inputErrors?.lut_no && (
                    <p className="absolute text-[13px] text-[#f10404]">
                      {inputErrors?.lut_no}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    IEC No *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter IEC No"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                    value={invoiceData.iec_no}
                    name="iec_no"
                    onChange={handleChange}
                  />
                  {inputErrors?.iec_no && (
                    <p className="absolute text-[13px] text-[#f10404]">
                      {inputErrors?.iec_no}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Invoice Details */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Invoice Details
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Invoice No *
              </label>
              <input
                type="text"
                placeholder="Enter invoice number"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_number}
                name="invoice_number"
                onChange={handleChange}
              />
              {inputErrors?.invoice_number && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.invoice_number}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_date}
                name="invoice_date"
                onChange={handleChange}
              />
              {inputErrors?.invoice_date && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.invoice_date}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_dueDate}
                name="invoice_dueDate"
                onChange={handleChange}
              />
              {inputErrors?.invoice_dueDate && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.invoice_dueDate}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Terms
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_terms}
                name="invoice_terms"
                onChange={handleChange}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                P.O. No *
              </label>
              <input
                type="text"
                placeholder="Enter P.O.NO"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.po_number}
                name="po_number"
                onChange={handleChange}
              />
              {inputErrors?.po_number && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.po_number}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                P.O. Date *
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.po_date}
                name="po_date"
                onChange={handleChange}
              />
              {inputErrors?.po_date && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.po_date}
                </p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Place of Supply *
              </label>
              <input
                type="text"
                placeholder="Enter place of supply"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.place_of_supply}
                name="place_of_supply"
                onChange={handleChange}
              />
              {inputErrors?.place_of_supply && (
                <p className="absolute text-[13px] text-[#f10404]">
                  {inputErrors?.place_of_supply}
                </p>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Customer Details
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Bill To */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                Bill To
              </h3>
              <div className="relative mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                  value={invoiceData.billcustomer_name}
                  name="billcustomer_name"
                  onChange={handleChange}
                />
                {inputErrors?.billcustomer_name && (
                  <p className="absolute text-[13px] text-[#f10404]">
                    {inputErrors?.billcustomer_name}
                  </p>
                )}
              </div>
              <div className="relative mb-4">
                <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                  Address *
                </label>
                <textarea
                  type="text"
                  placeholder="Enter address"
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
                  value={invoiceData.billcustomer_address}
                  name="billcustomer_address"
                  onChange={handleChange}
                />
                {inputErrors?.billcustomer_address && (
                  <p className="absolute top-26 text-[13px] text-[#f10404]">
                    {inputErrors?.billcustomer_address}
                  </p>
                )}
              </div>
              {/* GSTIN only for domestic */}
              {isDomestic && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                    GSTIN *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter GSTIN"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                    value={invoiceData.billcustomer_gstin}
                    name="billcustomer_gstin"
                    onChange={handleChange}
                  />
                  {inputErrors?.billcustomer_gstin && (
                    <p className="absolute text-[13px] text-[#f10404]">
                      {inputErrors?.billcustomer_gstin}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ship To */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                Ship To
              </h3>
              <div className="relative mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                  value={invoiceData.shipcustomer_name}
                  name="shipcustomer_name"
                  onChange={handleChange}
                />
                {inputErrors?.shipcustomer_name && (
                  <p className="absolute text-[13px] text-[#f10404]">
                    {inputErrors?.shipcustomer_name}
                  </p>
                )}
              </div>
              <div className="relative mb-4">
                <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                  Address *
                </label>
                <textarea
                  type="text"
                  placeholder="Enter address"
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
                  value={invoiceData.shipcustomer_address}
                  name="shipcustomer_address"
                  onChange={handleChange}
                />
                {inputErrors?.shipcustomer_address && (
                  <p className="absolute text-[13px] text-[#f10404] top-26">
                    {inputErrors?.shipcustomer_address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              placeholder="Enter subject"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
              value={invoiceData.subject}
              name="subject"
              onChange={handleChange}
            />
          </div>

          {/* Items */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Items
          </h2>
          <div>
            <table className="w-full border border-gray-300 border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    Sl No
                  </th>
                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-left"
                  >
                    Item & Description
                  </th>
                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    Hour
                  </th>
                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    Rate
                  </th>

                  {/* Show CGST/SGST for Domestic, IGST for International */}
                  {isDomestic ? (
                    <>
                      <th
                        colSpan="2"
                        className="border border-gray-300 px-3 py-2 text-center"
                      >
                        CGST
                      </th>
                      <th
                        colSpan="2"
                        className="border border-gray-300 px-3 py-2 text-center"
                      >
                        SGST
                      </th>
                    </>
                  ) : (
                    <th
                      colSpan="2"
                      className="border border-gray-300 px-3 py-2 text-center"
                    >
                      IGST
                    </th>
                  )}

                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    Amount
                  </th>
                  <th
                    rowSpan="2"
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    Action
                  </th>
                </tr>
                <tr>
                  {isDomestic ? (
                    <>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        %
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        Amt
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        %
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        Amt
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        %
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center">
                        Amt
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input
                        type="text"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700 placeholder:text-gray-400"
                        placeholder="Enter description"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        name="hours"
                        value={item.hours}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-gray-700"
                        placeholder="Hour"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        name="rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-gray-700"
                        placeholder="Rate"
                      />
                    </td>

                    {isDomestic ? (
                      <>
                        {/* CGST */}
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item?.cgst?.cgstPercent}
                            name="cgstPercent"
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700"
                            placeholder="%"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">
                          {item.cgst?.cgstAmount || "0.00"}
                        </td>

                        {/* SGST */}
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item?.sgst?.sgstPercent}
                            name="sgstPercent"
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700"
                            placeholder="%"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">
                          {item.sgst?.sgstAmount || "0.00"}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* IGST */}
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item?.igst?.igstPercent}
                            name="igstPercent"
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700"
                            placeholder="%"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">
                          {item.igst?.igstAmount || "0.00"}
                        </td>
                      </>
                    )}

                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-800">
                      {item.itemTotal || "0.00"}
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {index === invoiceData.items.length - 1 ? (
                        <CirclePlus
                          strokeWidth={1}
                          className="text-green-600 cursor-pointer"
                          onClick={addItem}
                        />
                      ) : (
                        <CircleMinus
                          strokeWidth={1}
                          className="text-red-500 cursor-pointer"
                          onClick={() => removeItem(index)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-6 border-b pb-2 border-gray-300">
            Totals
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div></div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Sub Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={formatNumber(invoiceData.subTotal)}
                  disabled
                />
              </div>

              {(() => {
                const grouped = groupTaxValues(invoiceData?.items || []);

                if (isDomestic) {
                  const merged = Object.keys({
                    ...grouped.cgst,
                    ...grouped.sgst,
                  }).filter((percent) => parseFloat(percent) > 0);

                  return (
                    <>
                      {merged.map((percent) => (
                        <React.Fragment key={percent}>
                          {grouped.cgst[percent] !== undefined && (
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-700">
                                CGST ({percent}%)
                              </span>
                              <input
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                                value={formatNumber(
                                  grouped.cgst[percent]?.toFixed(2)
                                )}
                                disabled
                              />
                            </div>
                          )}

                          {grouped.sgst[percent] !== undefined && (
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-700">
                                SGST ({percent}%)
                              </span>
                              <input
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                                value={formatNumber(
                                  grouped.sgst[percent]?.toFixed(2)
                                )}
                                disabled
                              />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  );
                } else {
                  // International - Show IGST
                  const igstPercentages = Object.keys(grouped.igst).filter(
                    (percent) => parseFloat(percent) > 0
                  );

                  return (
                    <>
                      {igstPercentages.map((percent) => (
                        <div key={percent} className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            IGST ({percent}%)
                          </span>
                          <input
                            type="text"
                            className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                            value={formatNumber(
                              grouped.igst[percent]?.toFixed(2)
                            )}
                            disabled
                          />
                        </div>
                      ))}
                    </>
                  );
                }
              })()}

              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                <span>Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right font-bold text-indigo-700"
                  value={formatNumber(invoiceData.total) || 0}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              type="text"
              placeholder="Enter note"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
              value={invoiceData.notes}
              name="notes"
              onChange={handleChange}
            />
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-16">
                For FessiT Solutions Private Limited
              </p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
