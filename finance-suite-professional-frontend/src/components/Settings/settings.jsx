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
        <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:max-w-6xl mx-auto">
          {/* Settings Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
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

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-2">
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
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">🧾 Invoice Settings Configuration</p>
              <p className="text-sm mt-2">Configure invoice templates, numbering, and preferences</p>
            </div>
          </>
        )}

        {activeTab === "tax" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Tax Settings
            </h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">💰 Tax Settings Configuration</p>
              <p className="text-sm mt-2">Manage tax rates, GST, and tax calculations</p>
            </div>
          </>
        )}

        {activeTab === "payment" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Payment Methods
            </h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">💳 Payment Methods Configuration</p>
              <p className="text-sm mt-2">Set up payment gateways and bank accounts</p>
            </div>
          </>
        )}

        {activeTab === "users" && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Users & Roles
            </h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">👥 User Management</p>
              <p className="text-sm mt-2">Manage users, roles, and permissions</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}