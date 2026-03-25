import React, { useEffect, useState } from "react";
import { CirclePlus, CircleMinus, ChevronDown, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";
import { useNavigate } from "react-router-dom";
import { formatNumber } from "../../utils/formatNumber";
import { KeyUri } from "../../shared/key";
import { useSelector, useDispatch } from "react-redux";
import { fetchOrganisationByEmail, fetchOneOrganisation, orgamisationSelector } from "../../ReduxApi/organisation";
import { createPurchaseOrder, fetchNextPONumber } from "../../ReduxApi/purchaseOrder";

const initialPOData = {
  company_name: "",
  gstIN: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  po_number: "",
  po_date: "",
  po_dueDate: "",
  po_terms: "",
  place_of_supply: "",
  currency_type: "INR",
  vendor_name: "",
  vendor_address: "",
  vendor_gstin: "",
  vendor_phone: "",
  vendor_email: "",
  subject: "",
  items: [
    {
      description: "",
      quantity: "",
      rate: "",
      itemTotal: "",
    },
  ],
  subTotal: "",
  total: "",
  notes: "",
  status: "Draft",
};

export default function AddPurchaseOrder() {
  const nav = useNavigate();
  const { currentOrganisation } = useSelector(orgamisationSelector);
  const dispatch = useDispatch();

  const [poData, setPoData] = useState(initialPOData);
  const [inputErrors, setInputErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [customCurrency, setCustomCurrency] = useState("");

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        await dispatch(fetchOrganisationByEmail(localStorage.getItem("email")));
      } catch (error) {
        console.error('Error fetching organisation:', error);
      }
    };
    fetchOrgData();
  }, [dispatch]);

  useEffect(() => {
    if (currentOrganisation) {
      const getNextPONumber = async () => {
        try {
          const nextNumber = await dispatch(fetchNextPONumber());

          setPoData((prev) => ({
            ...prev,
            company_name: currentOrganisation?.organizationName,
            gstIN: currentOrganisation?.gstIN,
            company_address: currentOrganisation?.addresses[0]?.value,
            company_phone: currentOrganisation?.phone,
            company_email: currentOrganisation?.email,
            po_number: nextNumber
          }));
        } catch (error) {
          console.error('Failed to fetch PO number:', error);
          setPoData((prev) => ({
            ...prev,
            company_name: currentOrganisation?.organizationName,
            gstIN: currentOrganisation?.gstIN,
            company_address: currentOrganisation?.addresses[0]?.value,
            company_phone: currentOrganisation?.phone,
            company_email: currentOrganisation?.email,
            po_number: `PO-001`
          }));
        }
      };

      getNextPONumber();
    }
  }, [currentOrganisation, dispatch]);

  useEffect(() => {
    if (!poData || !Array.isArray(poData.items)) return;

    const subTotal = poData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.itemTotal) || 0);
    }, 0);

    setPoData((prev) => ({
      ...prev,
      subTotal: subTotal.toFixed(2),
      total: subTotal.toFixed(2),
    }));
  }, [poData.items]);

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
      case "vendor_phone":
        if (!value) {
          error = "Phone number is required.";
        } else if (!selectedCountry.phone.test(value)) {
          error = `Invalid phone number for ${selectedCountry.cname}.`;
        } else if (value.length > 15) {
          error = "Phone number cannot exceed 15 digits.";
        }
        break;

      case "company_email":
      case "vendor_email":
        if (value && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value))
          error = "Invalid email address.";
        break;

      case "gstIN":
      case "vendor_gstin":
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

    const autoPopulatedFields = ['company_name', 'gstIN', 'company_address', 'company_phone', 'company_email', 'po_number'];
    if (autoPopulatedFields.includes(name)) {
      return;
    }

    // Handle currency type selection
    if (name === 'currency_type') {
      if (value === 'Others') {
        setShowCustomCurrency(true);
        setCustomCurrency("");
        setPoData({ ...poData, [name]: "" });
      } else {
        setShowCustomCurrency(false);
        setCustomCurrency("");
        setPoData({ ...poData, [name]: value });
      }
      return;
    }

    setPoData({ ...poData, [name]: value });
    validateField(name, value);

    if (inputErrors[name]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleCustomCurrencyChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    setCustomCurrency(value);
    setPoData({ ...poData, currency_type: value });
  };

  const handlePhoneChange = (e, field) => {
    let { value } = e.target;
    value = value.replace(/\D/g, "");
    setPoData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...poData.items];
    const item = updatedItems[index];

    if (["quantity", "rate", "itemTotal"].includes(name)) {
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        item[name] = value;
      }
    } else {
      item[name] = value;
    }

    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    item.itemTotal = (quantity * rate).toFixed(2);

    setPoData({ ...poData, items: updatedItems });
  };

  const addItem = () => {
    setPoData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          quantity: "",
          rate: "",
          itemTotal: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = poData.items.filter((_, i) => i !== index);
    setPoData({ ...poData, items: updatedItems });
  };

  const poDataSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!poData.company_name?.trim())
      newErrors.company_name = "Company name is required";
    if (!poData.gstIN?.trim()) newErrors.gstIN = "GSTIN is required";
    if (!poData.company_address?.trim())
      newErrors.company_address = "Address is required";
    if (!poData.company_phone?.trim())
      newErrors.company_phone = "Phone number is required";
    if (!poData.company_email?.trim())
      newErrors.company_email = "Email is required";

    if (!poData?.po_number?.trim())
      newErrors.po_number = "PO number is required";
    if (!poData?.po_date?.trim())
      newErrors.po_date = "PO date is required";
    if (!poData?.po_dueDate?.trim())
      newErrors.po_dueDate = "PO due date is required";
    if (!poData?.place_of_supply?.trim())
      newErrors.place_of_supply = "Place of supply is required";
    if (!poData?.vendor_name?.trim())
      newErrors.vendor_name = "Vendor name is required";
    if (!poData?.vendor_address?.trim())
      newErrors.vendor_address = "Vendor address is required";

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
      await dispatch(createPurchaseOrder(poData));
      toast.success("Purchase Order created successfully");
      setPoData(initialPOData);
      nav("/purchases");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong while creating purchase order");
    }
  };

  const goBack = () => {
    nav("/purchases");
  };

  return (
    <div className="relative">
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2 flex items-center gap-3">
            <ArrowLeft strokeWidth={1} onClick={goBack} className="cursor-pointer" />
            <span className="text-sm font-semibold text-gray-700">Purchase Orders</span>
          </div>
          <div className="flex flex-wrap justify-end mr-5 gap-2">
            <button
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
              onClick={poDataSubmit}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Organization Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                value={poData.company_name}
                name="company_name"
                disabled
              />
              {inputErrors?.company_name && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.company_name}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN *</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                value={poData.gstIN}
                name="gstIN"
                disabled
              />
              {inputErrors?.gstIN && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.gstIN}</p>
              )}
            </div>
            <div className="col-span-2 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
              <textarea
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-20 bg-gray-50 cursor-not-allowed"
                name="company_address"
                value={poData.company_address}
                disabled
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
              <div className="flex items-center">
                <select className="py-2 px-6 text-sm bg-gray-100 border border-gray-300 rounded-l-lg cursor-not-allowed" disabled>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.cid} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="border border-l-0 ml-2 border-gray-300 rounded-r-lg px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                  value={poData?.company_phone}
                  name="company_phone"
                  disabled
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                value={poData.company_email}
                name="company_email"
                disabled
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Purchase Order Details
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">PO No *</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                value={poData.po_number}
                name="po_number"
                disabled
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">PO Date *</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.po_date}
                name="po_date"
                onChange={handleChange}
              />
              {inputErrors?.po_date && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.po_date}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date *</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.po_dueDate}
                name="po_dueDate"
                onChange={handleChange}
              />
              {inputErrors?.po_dueDate && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.po_dueDate}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Terms</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.po_terms}
                name="po_terms"
                onChange={handleChange}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Place of Supply *</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.place_of_supply}
                name="place_of_supply"
                onChange={handleChange}
              />
              {inputErrors?.place_of_supply && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.place_of_supply}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Currency *</label>
              <select
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={showCustomCurrency ? 'Others' : poData.currency_type}
                name="currency_type"
                onChange={handleChange}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CHF">CHF</option>
                <option value="CNY">CNY (¥)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="Others">Others</option>
              </select>
              {showCustomCurrency && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Enter 3-letter currency code (e.g., AED)"
                    className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 placeholder:text-gray-400"
                    value={customCurrency}
                    onChange={handleCustomCurrencyChange}
                    maxLength={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 3-character currency code (e.g., AED, SAR, THB)</p>
                </div>
              )}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">
            Vendor Details
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Name *</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.vendor_name}
                name="vendor_name"
                onChange={handleChange}
              />
              {inputErrors?.vendor_name && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.vendor_name}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor GSTIN</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.vendor_gstin}
                name="vendor_gstin"
                onChange={handleChange}
              />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Address *</label>
              <textarea
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-20"
                value={poData.vendor_address}
                name="vendor_address"
                onChange={handleChange}
              />
              {inputErrors?.vendor_address && (
                <p className="absolute text-[13px] text-[#f10404]">{inputErrors?.vendor_address}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Phone</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.vendor_phone}
                name="vendor_phone"
                onChange={(e) => handlePhoneChange(e, 'vendor_phone')}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Email</label>
              <input
                type="email"
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
                value={poData.vendor_email}
                name="vendor_email"
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700"
              value={poData.subject}
              name="subject"
              onChange={handleChange}
            />
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-gray-300">Items</h2>
          <div>
            <table className="w-full border border-gray-300 border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-center">Sl No</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Quantity</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Rate</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Amount</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {poData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input
                        type="text"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-gray-700"
                        placeholder="Enter description"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-gray-700"
                        placeholder="Qty"
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
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-800">
                      {item.itemTotal || "0.00"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {index === poData.items.length - 1 ? (
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

          <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-6 border-b pb-2 border-gray-300">Totals</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div></div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Sub Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right"
                  value={formatNumber(poData.subTotal)}
                  disabled
                />
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                <span>Total</span>
                <input
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 w-32 text-right font-bold text-indigo-700"
                  value={formatNumber(poData.total) || 0}
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              className="border border-gray-300 rounded px-3 py-2 w-full text-sm text-gray-700 h-24"
              name="notes"
              value={poData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end mt-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-16">
                For {poData.company_name || "Organization"}
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
