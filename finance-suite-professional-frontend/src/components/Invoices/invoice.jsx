import React, { useEffect, useState } from "react";
import { CirclePlus } from "lucide-react";
import { CircleMinus } from "lucide-react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";
import { ChevronDown } from "lucide-react";

// const countries = [
//   { code: "+91", name: "India", flag: "🇮🇳" },
//   { code: "+1", name: "United States", flag: "🇺🇸" },
//   { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
//   { code: "+61", name: "Australia", flag: "🇦🇺" },
//   { code: "+49", name: "Germany", flag: "🇩🇪" },
//   { code: "+33", name: "France", flag: "🇫🇷" },
// ];
const initialInvoiceData = {
  company_name: "",
  gstIN: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  invoice_number: "",
  invoice_date: "",
  invoice_dueDate: "",
  invoice_terms: "Due on receipt",
  po_number: "",
  place_of_supply: "",
  billcustomer_name: "",
  billcustomer_address: "",
  billcustomer_gstin: "",
  shipcustomer_name: "",
  shipcustomer_address: "",
  shipcustomer_gstin: "",
  subject: "",
  items: [{ description: "", hours: "", rate: "", cgst: "", sgst: "" }],
  notes: "",
  subTotal: "",
  totalcgst: "",
  totalsgst: "",
  total: "",
};
export default function Invoice() {
  const [invoiceData, setInvoiceData] = useState(initialInvoiceData);
  const [inputErrors, setInputErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  // const selected = countries.find((c) => c.code === selectedCountry);
  // console.log(selected)

  const handleSelect = (e) => {
    const selected = countries.find((c) => c.code === e.target.value);
    setSelectedCountry(selected);
  };
  const validateField = (name, value) => {
    let error = "";
    console.log(error);

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
    let { name , value } = e.target;

    // Allow only numbers — remove anything else
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

    if (["hours", "rate", "cgst", "sgst"].includes(name)) {
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        updatedItems[index][name] = value;
      }
    } else {
      updatedItems[index][name] = value;
    }

    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        { description: "", hours: "", cgst: "", sgst: "" },
      ],
    });
  };

  const removeItem = (index) => {
    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const invoiceDataSubmit = (e) => {
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
    if (!invoiceData?.invoice_number?.trim())
      newErrors.invoice_number = "Invoice number is required";
    if (!invoiceData?.invoice_date?.trim())
      newErrors.invoice_date = "Invoice date is required";
    if (!invoiceData?.invoice_dueDate?.trim())
      newErrors.invoice_dueDate = "Invoice due date is required";
    if (!invoiceData?.po_number?.trim())
      newErrors.po_number = "PO.NO is required";
    if (!invoiceData?.place_of_supply?.trim())
      newErrors.place_of_supply = "Place of supply is required";
    if (!invoiceData?.billcustomer_name?.trim())
      newErrors.billcustomer_name = "Customer name is required";
    if (!invoiceData?.billcustomer_address?.trim())
      newErrors.billcustomer_address = "Address is required";
    if (!invoiceData?.billcustomer_gstin?.trim())
      newErrors.billcustomer_gstin = "GSTIN required";
    if (!invoiceData?.shipcustomer_name?.trim())
      newErrors.shipcustomer_name = "Customer name required";
    if (!invoiceData?.shipcustomer_address?.trim())
      newErrors.shipcustomer_address = "Address is required";
    if (!invoiceData?.shipcustomer_gstin?.trim())
      newErrors.shipcustomer_gstin = "GSTIN is required";

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

    //clear error message
    setInputErrors({});

    console.log(invoiceData);
    setInvoiceData(initialInvoiceData);
  };
  console.log(selectedCountry);
  return (
    <div className="relative">
    {/* Fixed Buttons at Top */}
		<div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
  <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:max-w-6xl mx-auto">
    <div className="flex flex-wrap justify-end gap-2 -mr-27">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        onClick={invoiceDataSubmit}
      >
        💾 Save
      </button>
      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto">
        ⬇️ Download
      </button>
      <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto">
        🖨️ Print
      </button>
      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full sm:w-auto">
        ✉️ Email
      </button>
    </div>
  </div>
</div>
	
      <div>
        <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
          {/* <!-- Company Details --> */}
          {/* <form> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Company Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                className="border relative border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
                className="border reltive border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
                className="border relative border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 h-20 placeholder:text-gray-400"
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

                <div className="flex items-center ">
                  <div className="flex items-center">
                    <select
                      onChange={(e) => handleSelect(e)}
                      className="flex items-center gap-2 py-2 px-6 text-sm font-medium 
            text-gray-900 bg-gray-100  border border-gray-300 rounded-l-lg 
             dark:text-gray-100 
            cursor-pointer appearance-none"
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
                    className="border border-l-0 ml-2  border-gray-300 rounded-r-lg px-3 py-2 w-full 
          text-sm text-gray-700 placeholder:text-gray-400 dark:bg-gray-800 
          dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-gray-300"
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
          </div>

          {/* <!-- Invoice Details --> */}
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_number}
                name="invoice_number"
                onChange={handleChange}
              />
              {inputErrors?.invoice_number && (
                <p className="absolute text-[13px]  text-[#f10404]">
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_date}
                name="invoice_date"
                onChange={handleChange}
              />
              {inputErrors?.invoice_date && (
                <p className="absolute text-[13px]  text-[#f10404]">
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.invoice_dueDate}
                name="invoice_dueDate"
                onChange={handleChange}
              />
              {inputErrors?.invoice_dueDate && (
                <p className="absolute text-[13px]  text-[#f10404]">
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.po_number}
                name="po_number"
                onChange={handleChange}
              />
              {inputErrors?.po_number && (
                <p className="absolute text-[13px]  text-[#f10404]">
                  {inputErrors?.po_number}
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
                className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                value={invoiceData.place_of_supply}
                name="place_of_supply"
                onChange={handleChange}
              />
              {inputErrors?.place_of_supply && (
                <p className="absolute text-[13px]  text-[#f10404]">
                  {inputErrors?.place_of_supply}
                </p>
              )}
            </div>
          </div>

          {/* <!-- Bill To / Ship To --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Customer Details
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
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
                  className="border border-gray-300 rounded px-3
                py-2 w-full text-sm text-gray-700  placeholder:text-gray-400"
                  value={invoiceData.billcustomer_name}
                  name="billcustomer_name"
                  onChange={handleChange}
                />
                {inputErrors?.billcustomer_name && (
                  <p className=" absolute text-[13px] text-[#f10404]">
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
                  className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
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
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                  GSTIN *
                </label>
                <input
                  type="text"
                  placeholder="Enter GSTIN"
                  className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
            </div>

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
                  className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
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
                  className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
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
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mt-2 mb-1">
                  GSTIN *
                </label>
                <input
                  type="text"
                  placeholder="Enter GSTIN"
                  className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                  value={invoiceData.shipcustomer_gstin}
                  name="shipcustomer_gstin"
                  onChange={handleChange}
                />
                {inputErrors?.shipcustomer_gstin && (
                  <p className="absolute text-[13px] text-[#f10404]">
                    {inputErrors?.shipcustomer_gstin}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* <!-- Subject --> */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              placeholder="Enter subject"
              className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
              value={invoiceData.subject}
              name="subject"
              onChange={handleChange}
            />
          </div>

          {/* <!-- Items Table --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Items
          </h2>
          <div>
            <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2">Sl No</th>
                  <th className="border border-gray-300 px-3 py-2">
                    Description
                  </th>
                  <th className="border border-gray-300 px-3 py-2">Hours</th>
                  <th className="border border-gray-300 px-3 py-2">Rate</th>
                  <th className="border border-gray-300 px-3 py-2">CGST %</th>
                  <th className="border border-gray-300 px-3 py-2">SGST %</th>
                  <th className="border border-gray-300 px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData?.items?.map((item, index) => (
                  <tr key={index}>
                    <td
                      className="border border-gray-300
                   px-3 py-2 text-center text-gray-700"
                    >
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input
                        type="text"
                        placeholder="Enter description"
                        className="border
                       border-gray-300 rounded 
                       px-2 py-1 w-full text-gray-700 
                       transform transition-all duration-300 ease-in-out
                       placeholder:text-gray-400"
                        value={item?.description}
                        name="description"
                        onChange={(e) => handleItemChange(index, e)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        placeholder="hours"
                        className="border
                       border-gray-300 
                       rounded px-2 py-1 
                       w-20 text-right text-gray-700
                       placeholder:text-gray-400"
                        value={item.hours}
                        name="hours"
                        onChange={(e) => handleItemChange(index, e)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input
                        type="number"
                        placeholder="rate"
                        className="border
                       border-gray-300
                       text-gray-700
                        rounded px-2 py-1 w-24 
                        text-center placeholder:text-gray-400"
                        value={item.rate}
                        name="rate"
                        onChange={(e) => handleItemChange(index, e)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        placeholder="cgst"
                        className="border
                       border-gray-300 
                       rounded px-2 py-1 w-16 
                       text-center text-gray-700 placeholder:text-gray-400"
                        value={item.cgst}
                        name="cgst"
                        onChange={(e) => handleItemChange(index, e)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        placeholder="sgst"
                        className="border
                       border-gray-300 
                       rounded px-2 py-1 w-16 
                       text-center text-gray-700 placeholder:text-gray-400"
                        value={item.sgst}
                        name="sgst"
                        onChange={(e) => handleItemChange(index, e)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {index === invoiceData.items.length - 1 ? (
                        <div className="relative group flex justify-center">
                          <CirclePlus
                            strokeWidth={1}
                            className=" text-[#0d0d0d] cursor-pointer"
                            onClick={addItem}
                          />
                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
               hidden group-hover:block 
               bg-gray-800 text-white text-xs rounded py-1 px-2
               whitespace-nowrap shadow-md"
                          >
                            Add new item
                          </span>
                        </div>
                      ) : (
                        <div className="relative group flex justify-center">
                          <CircleMinus
                            strokeWidth={1}
                            className="text-[#f10404] cursor-pointer"
                            onClick={() => removeItem(index)}
                          />
                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
               hidden group-hover:block 
               bg-gray-800 text-white text-xs rounded py-1 px-2
               whitespace-nowrap shadow-md"
                          >
                            Remove item
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* <!-- Totals --> */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
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
                  value={invoiceData.subTotal}
                  name="total"
                  disabled
                />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">CGST (9%)</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={invoiceData.totalcgst}
                  name="total"
                  disabled
                />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">SGST (9%)</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={invoiceData.totalsgst}
                  name="total"
                  disabled
                />
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
                <span>Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 
             text-right font-bold text-indigo-700"
                  value={invoiceData.total}
                  name="total"
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
              className="border border-gray-300 rounded px-3 
                py-2 w-full text-sm text-gray-700 placeholder:text-gray-400 h-20"
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
              <div className="border-t border-gray-400 pt-2 ">
                <p className="text-sm text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
          {/* </form> */}
        </div>
      </div>
    </div>
  );
}
