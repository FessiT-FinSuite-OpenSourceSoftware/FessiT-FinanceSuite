import React, { useState } from "react";
import { toast } from "react-toastify";
import { countries } from "../../shared/countries";

const initialCustomer = {
  customerName: "",
  companyName: "",
  gstIN: "",
  addresses: [""], // supports multiple addresses
  country: countries[0].cname,
  phone: "",
  email: "",
};

export default function CustomerCreation() {
  const [customer, setCustomer] = useState(initialCustomer);
  const [errors, setErrors] = useState({});

  // Country select
  const handleSelect = (e) => {
    const selected = countries.find((c) => c.code === e.target.value);
    setCustomer({ ...customer, country: selected.cname });
  };

  // Generic field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomer({ ...customer, [name]: value });
  };

  // Handle address changes
  const handleAddressChange = (e, index) => {
    const updated = [...customer.addresses];
    updated[index] = e.target.value;
    setCustomer({ ...customer, addresses: updated });
  };

  // Add new address
  const addAddress = () => {
    setCustomer((prev) => ({
      ...prev,
      addresses: [...prev.addresses, ""],
    }));
  };

  // Remove an address
  const removeAddress = (index) => {
    setCustomer((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!customer.customerName.trim())
      newErrors.customerName = "Customer name is required";
    if (!customer.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!customer.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
    if (customer.addresses.every((addr) => !addr.trim()))
      newErrors.address = "At least one address is required";
    if (!customer.phone.trim()) newErrors.phone = "Phone number is required";
    if (!customer.email.trim()) newErrors.email = "Email is required";
    else if (!/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(customer.email))
      newErrors.email = "Invalid email format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    toast.success("Customer created successfully!");
    console.log(customer);
    setCustomer(initialCustomer);
  };

  return (
    <div className="relative">
      {/* Fixed Buttons at Top */}
		<div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
  <div className="w-[100%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:max-w-6xl mx-auto">
    <div className="flex flex-wrap justify-end gap-2">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        onClick={handleSubmit}
      >
        💾 Save
      </button>
      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto">
        ⬇️ Edit
      </button>
      <button
		className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        onClick={handleSubmit}
	  >
        ✉️ Create
      </button>
    </div>
  </div>
</div>

      {/* Customer Form Section */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10 ">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
          Customer Details
        </h2>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          {/* Customer Name */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              name="customerName"
              value={customer.customerName}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
            {errors.customerName && (
              <p className="absolute text-[13px] text-[#f10404]">
                {errors.customerName}
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
              value={customer.companyName}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter company name"
            />
            {errors.companyName && (
              <p className="absolute text-[13px] text-[#f10404]">
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
              value={customer.gstIN}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter GSTIN"
            />
            {errors.gstIN && (
              <p className="absolute text-[13px] text-[#f10404]">
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
              value={countries.find((c) => c.cname === customer.country)?.code}
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
              value={customer.phone}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                setCustomer({ ...customer, phone: value });
              }}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="absolute text-[13px] text-[#f10404]">{errors.phone}</p>
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
              value={customer.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer email"
            />
            {errors.email && (
              <p className="absolute text-[13px] text-[#f10404]">{errors.email}</p>
            )}
          </div>
		  
          {/* Addresses Section */}
			<div className="relative col-span-2">
			  <label className="block text-gray-700 font-medium mb-1">
				Addresses *
			  </label>

			  {customer.addresses.map((addr, index) => (
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
				<p className="absolute text-[13px] text-[#f10404] mt-1">
				  {errors.address}
				</p>
			  )}
			</div>
          

          
        </div>
      </div>
    </div>
  );
}
