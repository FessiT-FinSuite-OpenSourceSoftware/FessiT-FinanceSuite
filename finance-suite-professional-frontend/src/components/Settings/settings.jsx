import React, { useState } from "react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";

const initialSettings = {
  organizationName: "",
  companyName: "",
  gstIN: "",
  addresses: [""],
  country: countries[0].cname,
  phone: "",
  email: "",
  // --- Invoice Settings ---
  invoicePrefix: "INV",
  startingInvoiceNo: "1001",
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
  paymentTerms: "30",
  latePaymentFee: "",
  earlyDiscount: "",
  discountDays: "",
  paymentInstructions: "",
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  footerNote: "",
  // --- Tax Settings ---
  taxRegime: "GST",
  taxType: "exclusive",
  cgst: "",
  sgst: "",
  igst: "",
  inputTaxCredit: "enabled",
  requireHSN: "yes",
  roundingRule: "nearest",
  taxNotes: "",

  // --- Users & Roles ---
  newUserName: "",
  newUserEmail: "",
  newUserRole: "Viewer",
  newUserStatus: "Active",
  permissions: {
    Admin: { view: true, edit: true, delete: true, export: true },
    Manager: { view: true, edit: true, delete: false, export: true },
    Accountant: { view: true, edit: true, delete: false, export: true },
    Viewer: { view: true, edit: false, delete: false, export: false },
    Custom: { view: false, edit: false, delete: false, export: false },
  },

  // --- Payment Methods ---
  enabledMethods: {
    bankTransfer: true,
    upi: true,
    card: false,
    paypal: false,
    cash: true,
  },
  paymentBankName: "",
  paymentAccountNo: "",
  paymentIFSC: "",
  paymentAccountHolder: "",
  paymentUpiId: "",
  paypalEmail: "",
  paypalClientId: "",
  cardProvider: "",
  cardApiKey: "",
  cashInstructions: "",
  customPaymentName: "",

};

export default function SettingsCreation() {
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("organization");

  // Country select
  const handleSelect = (e) => {
    const selected = countries.find((c) => c.code === e.target.value);
    setSettings({ ...settings, country: selected.cname });
  };

  // Generic field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  // Handle address changes
  const handleAddressChange = (e, index) => {
    const updated = [...settings.addresses];
    updated[index] = e.target.value;
    setSettings({ ...settings, addresses: updated });
  };

  // Add new address
  const addAddress = () => {
    setSettings((prev) => ({
      ...prev,
      addresses: [...prev.addresses, ""],
    }));
  };

  // Remove an address
  const removeAddress = (index) => {
    setSettings((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!settings.organizationName.trim())
      newErrors.organizationName = "Organization name is required";
    if (!settings.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!settings.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
    if (settings.addresses.every((addr) => !addr.trim()))
      newErrors.address = "At least one address is required";
    if (!settings.phone.trim()) newErrors.phone = "Phone number is required";
    if (!settings.email.trim()) newErrors.email = "Email is required";
    else if (!/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(settings.email))
      newErrors.email = "Invalid email format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    toast.success("Settings saved successfully!");
    console.log(settings);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setErrors({});
  };

  return (
    <>
      {/* Fixed Buttons at Top */}
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[98%] xl:max-w-8xl mx-auto">
          {/* Settings Tabs and Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-0">
            {/* Settings Tabs - Left Aligned */}
            <div className="flex flex-wrap gap-2 flex-none border-b border-gray-200 pb-0">
              <button
                onClick={() => setActiveTab("organization")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "organization"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🏢 Organization
              </button>
              <button
                onClick={() => setActiveTab("invoice")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "invoice"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🧾 Invoice Settings
              </button>
              <button
                onClick={() => setActiveTab("tax")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "tax"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💰 Tax Settings
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "payment"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💳 Payment Methods
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                👥 Users & Roles
              </button>
            </div>

            {/* Action Buttons - Right Aligned */}
            <div className="flex flex-wrap gap-2 justify-end flex-shrink-0 pb-3">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={handleSubmit}
              >
                💾 Save
              </button>
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
                onClick={() => alert('Edit mode activated')}
              >
                ⬇️ Edit
              </button>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto"
                onClick={handleReset}
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
        {activeTab === "organization" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Organization Settings
            </h2>

            {/* Form Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Organization Name */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={settings.organizationName}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter organization name"
                />
                {errors.organizationName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.organizationName}
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
                {errors.companyName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              {/* GSTIN */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">GSTIN *</label>
                <input
                  type="text"
                  name="gstIN"
                  value={settings.gstIN}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter GSTIN"
                />
                {errors.gstIN && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.gstIN}
                  </p>
                )}
              </div>

              {/* Country */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Country *
                </label>
                <select
                  onChange={handleSelect}
                  value={countries.find((c) => c.cname === settings.country)?.code}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.cid} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={settings.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    setSettings({ ...settings, phone: value });
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={settings.email}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter organization email"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Addresses Section */}
              <div className="relative col-span-2">
                <label className="block text-gray-700 font-medium mb-1">
                  Addresses *
                </label>

                {settings.addresses.map((addr, index) => (
                  <div key={index} className="mb-4 relative border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-600">
                        Address {index + 1}
                      </h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          ✖ Remove
                        </button>
                      )}
                    </div>

                    <textarea
                      name={`address_${index}`}
                      value={addr}
                      onChange={(e) => handleAddressChange(e, index)}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                      placeholder="Enter address"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAddress}
                  className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-800 mt-2"
                >
                  ➕ Add another address
                </button>

                {errors.address && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.address}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "invoice" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Invoice Settings
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Invoice Prefix */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Invoice Prefix *
                </label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={settings.invoicePrefix || ""}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., INV"
                />
              </div>

              {/* Starting Invoice Number */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Starting Invoice Number *
                </label>
                <input
                  type="number"
                  name="startingInvoiceNo"
                  value={settings.startingInvoiceNo || ""}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 1001"
                />
              </div>

              {/* Invoice Date Format */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Date Format
                </label>
                <select
                  name="dateFormat"
                  value={settings.dateFormat || "DD/MM/YYYY"}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              {/* Currency */}
              <div className="relative">
                <label className="block text-gray-700 font-medium mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  value={settings.currency || "INR"}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                >
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                  <option value="GBP">£ British Pound (GBP)</option>
                </select>
              </div>

              {/* Payment Terms Section */}
              <div className="col-span-2 mt-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                  Payment Terms
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Default Payment Terms */}
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Default Payment Terms
                    </label>
                    <select
                      name="paymentTerms"
                      value={settings.paymentTerms || "30"}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="0">Due on Receipt</option>
                      <option value="7">Net 7 Days</option>
                      <option value="15">Net 15 Days</option>
                      <option value="30">Net 30 Days</option>
                      <option value="45">Net 45 Days</option>
                    </select>
                  </div>

                  {/* Late Payment Fee */}
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Late Payment Fee (%)
                    </label>
                    <input
                      type="number"
                      name="latePaymentFee"
                      value={settings.latePaymentFee || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., 2"
                    />
                  </div>

                  {/* Early Payment Discount */}
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Early Payment Discount (%)
                    </label>
                    <input
                      type="number"
                      name="earlyDiscount"
                      value={settings.earlyDiscount || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., 1.5"
                    />
                  </div>

                  {/* Discount Days */}
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Discount Days
                    </label>
                    <input
                      type="number"
                      name="discountDays"
                      value={settings.discountDays || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., 10"
                    />
                  </div>

                  {/* Payment Instructions */}
                  <div className="relative col-span-2">
                    <label className="block text-gray-700 font-medium mb-1">
                      Payment Instructions
                    </label>
                    <textarea
                      name="paymentInstructions"
                      value={settings.paymentInstructions || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                      placeholder="e.g., Please make payments via bank transfer or UPI within 30 days."
                    />
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="col-span-2 mt-6">
                <h3 className="text-md font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                  Bank Account Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="accountHolder"
                      value={settings.accountHolder || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., ABC Pvt Ltd"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={settings.bankName || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., HDFC Bank"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={settings.accountNumber || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., 1234567890"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      IFSC / SWIFT Code
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={settings.ifscCode || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., HDFC0001234 or BOFAUS3N"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      UPI ID (optional)
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={settings.upiId || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., abc@okhdfcbank"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="relative col-span-2 mt-6">
                <label className="block text-gray-700 font-medium mb-1">
                  Invoice Footer Note
                </label>
                <textarea
                  name="footerNote"
                  value={settings.footerNote || ""}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                  placeholder="e.g., Thank you for your business!"
                />
              </div>
            </div>
          </>
        )}



        {activeTab === "tax" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Tax Settings
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Tax Regime */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                Default Tax Regime
              </label>
              <select
                name="taxRegime"
                value={settings.taxRegime || "GST"}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              >
                <option value="GST">GST (India)</option>
                <option value="VAT">VAT (Other Regions)</option>
                <option value="None">No Tax / Non-Registered</option>
              </select>
            </div>

            {/* Tax Inclusive/Exclusive */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                Default Tax Type
              </label>
              <select
                name="taxType"
                value={settings.taxType || "exclusive"}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              >
                <option value="exclusive">Tax Exclusive (Added on top)</option>
                <option value="inclusive">Tax Inclusive (Included in price)</option>
              </select>
            </div>

            {/* CGST */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                CGST (%)
              </label>
              <input
                type="number"
                name="cgst"
                value={settings.cgst || ""}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 9"
              />
            </div>

            {/* SGST */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                SGST (%)
              </label>
              <input
                type="number"
                name="sgst"
                value={settings.sgst || ""}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 9"
              />
            </div>

            {/* IGST */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                IGST (%)
              </label>
              <input
                type="number"
                name="igst"
                value={settings.igst || ""}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 18"
              />
            </div>

            {/* Input Tax Credit */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                Input Tax Credit
              </label>
              <select
                name="inputTaxCredit"
                value={settings.inputTaxCredit || "enabled"}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Require HSN/SAC */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                Require HSN / SAC Code
              </label>
              <select
                name="requireHSN"
                value={settings.requireHSN || "yes"}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              >
                <option value="yes">Yes, mandatory</option>
                <option value="no">No, optional</option>
              </select>
            </div>

            {/* Rounding Rule */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">
                Tax Rounding Rule
              </label>
              <select
                name="roundingRule"
                value={settings.roundingRule || "nearest"}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              >
                <option value="nearest">Round to nearest ₹</option>
                <option value="up">Always round up</option>
                <option value="down">Always round down</option>
                <option value="none">No rounding</option>
              </select>
            </div>

            {/* Tax Notes */}
            <div className="relative col-span-2 mt-6">
              <label className="block text-gray-700 font-medium mb-1">
                Tax Notes / Footer Text
              </label>
              <textarea
                name="taxNotes"
                value={settings.taxNotes || ""}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                placeholder="e.g., Prices are subject to GST as applicable under Indian law."
              />
            </div>
          </div>
        </>
      )}


        {activeTab === "payment" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Payment Methods
          </h2>

          <div className="space-y-8">
            {/* Available Payment Methods */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Supported Payment Options
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Bank Transfer", key: "bankTransfer" },
                  { name: "UPI / QR Code", key: "upi" },
                  { name: "Credit / Debit Card", key: "card" },
                  { name: "PayPal", key: "paypal" },
                  { name: "Cash", key: "cash" },
                ].map((method) => (
                  <div
                    key={method.key}
                    className="flex items-center justify-between border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <span className="text-gray-700 font-medium">
                      {method.name}
                    </span>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={settings.enabledMethods?.[method.key] || false}
                          onChange={() => {
                            const updated = { ...settings.enabledMethods };
                            updated[method.key] = !updated[method.key];
                            setSettings({ ...settings, enabledMethods: updated });
                          }}
                        />
                        <div
                          className={`block w-12 h-6 rounded-full transition ${
                            settings.enabledMethods?.[method.key]
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                            settings.enabledMethods?.[method.key]
                              ? "transform translate-x-6"
                              : ""
                          }`}
                        ></div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Transfer Details */}
            {settings.enabledMethods?.bankTransfer && (
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  Bank Transfer Details
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="paymentBankName"
                      value={settings.paymentBankName || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., HDFC Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="paymentAccountNo"
                      value={settings.paymentAccountNo || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., 1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      name="paymentIFSC"
                      value={settings.paymentIFSC || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., HDFC0001234"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="paymentAccountHolder"
                      value={settings.paymentAccountHolder || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., ABC Pvt Ltd"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* UPI / QR Details */}
            {settings.enabledMethods?.upi && (
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  UPI / QR Code Details
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      name="paymentUpiId"
                      value={settings.paymentUpiId || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., business@okaxis"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      QR Code Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        toast.info(`QR image uploaded: ${e.target.files[0]?.name}`)
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 w-full bg-gray-50 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PayPal Details */}
            {settings.enabledMethods?.paypal && (
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  PayPal Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      PayPal Email
                    </label>
                    <input
                      type="email"
                      name="paypalEmail"
                      value={settings.paypalEmail || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., paypal@yourcompany.com"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      PayPal Client ID
                    </label>
                    <input
                      type="text"
                      name="paypalClientId"
                      value={settings.paypalClientId || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter your PayPal Client ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Credit/Debit Card */}
            {settings.enabledMethods?.card && (
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  Card Payment Gateway
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Provider Name
                    </label>
                    <input
                      type="text"
                      name="cardProvider"
                      value={settings.cardProvider || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., Stripe / Razorpay"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      API Key / Merchant ID
                    </label>
                    <input
                      type="text"
                      name="cardApiKey"
                      value={settings.cardApiKey || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter API key or Merchant ID"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cash Instructions */}
            {settings.enabledMethods?.cash && (
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  Cash Payment Instructions
                </h3>
                <textarea
                  name="cashInstructions"
                  value={settings.cashInstructions || ""}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                  placeholder="e.g., Accept cash payments at the billing counter only."
                />
              </div>
            )}

            {/* Add Custom Payment Method */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                Add Custom Payment Method
              </h3>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  name="customPaymentName"
                  value={settings.customPaymentName || ""}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md px-3 py-2 flex-1 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Crypto Wallet, Cheque, etc."
                />
                <button
                  onClick={() => {
                    if (settings.customPaymentName?.trim()) {
                      const updated = {
                        ...settings.enabledMethods,
                        [settings.customPaymentName]: true,
                      };
                      setSettings({
                        ...settings,
                        enabledMethods: updated,
                        customPaymentName: "",
                      });
                      toast.success("Custom payment method added!");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ➕ Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}
        {activeTab === "users" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Users & Roles
          </h2>

          <div className="space-y-8">
            {/* User List Section */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Existing Users
              </h3>

              <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">Name</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">Email</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">Role</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">Status</th>
                    <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Example Static Rows (replace with mapped users) */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">John Doe</td>
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">john@example.com</td>
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">Admin</td>
                    <td className="py-2 px-4 text-sm text-green-600 font-semibold border-b">Active</td>
                    <td className="py-2 px-4 text-center border-b">
                      <button className="text-blue-600 hover:text-blue-800 text-sm mr-2">Edit</button>
                      <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">Jane Smith</td>
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">jane@company.com</td>
                    <td className="py-2 px-4 text-sm text-gray-800 border-b">Manager</td>
                    <td className="py-2 px-4 text-sm text-yellow-600 font-semibold border-b">Pending</td>
                    <td className="py-2 px-4 text-center border-b">
                      <button className="text-blue-600 hover:text-blue-800 text-sm mr-2">Edit</button>
                      <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Add New User Form */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                Add New User
              </h3>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* Name */}
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="newUserName"
                    value={settings.newUserName || ""}
                    onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter user's full name"
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="newUserEmail"
                    value={settings.newUserEmail || ""}
                    onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter user's email address"
                  />
                </div>

                {/* Role */}
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-1">Role *</label>
                  <select
                    name="newUserRole"
                    value={settings.newUserRole || "Viewer"}
                    onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Status */}
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-1">Status</label>
                  <select
                    name="newUserStatus"
                    value={settings.newUserStatus || "Active"}
                    onChange={handleChange}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => toast.success('New user added successfully!')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ➕ Add User
                </button>
              </div>
            </div>

            {/* Roles & Permissions Section */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                Roles & Permissions
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">Role</th>
                      <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">View</th>
                      <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">Edit</th>
                      <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">Delete</th>
                      <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["Admin", "Manager", "Accountant", "Viewer", "Custom"].map((role) => (
                      <tr key={role} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-gray-800 border-b">{role}</td>
                        {["view", "edit", "delete", "export"].map((perm) => (
                          <td key={perm} className="py-2 px-4 text-center border-b">
                            <input
                              type="checkbox"
                              checked={
                                settings.permissions?.[role]?.[perm] || role === "Admin"
                              }
                              disabled={role === "Admin"}
                              onChange={() => {
                                const updated = { ...settings.permissions };
                                updated[role] = {
                                  ...updated[role],
                                  [perm]: !updated[role]?.[perm],
                                };
                                setSettings({ ...settings, permissions: updated });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      </div>
    </>
  );
}