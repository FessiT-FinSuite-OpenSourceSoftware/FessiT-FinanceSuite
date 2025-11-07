import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
// import { countries } from "../../shared/countries";
import { Pencil, Save } from "lucide-react"; // 🖊️ and 💾 icons
import { ArrowLeft } from "lucide-react";
import { countriesData } from "../../utils/countriesData";
import { ChevronDown } from "lucide-react";
import { useNavigate,useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useSelector,useDispatch } from "react-redux";
import { customerSelector, fetchOneCustomer } from "../../ReduxApi/customer";


const initialCustomer = {
  customerName: "",
  companyName: "",
  gstIN: "",
  addresses: [{ label: "Primary Address", value: "", isEditing: false }],
  country: "",
  countryCode: "",
  phone: "",
  email: "",
};

export default function ViewCustomer() {
  const [customer, setCustomer] = useState(initialCustomer);
  const [inputErrors, setInputErrors] = useState({});
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState({});
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);
  const dispatch  = useDispatch()
  const {id} = useParams()
  const {currentCustomer} = useSelector(customerSelector)
  console.log(currentCustomer)

  // ✅ Fetch customer details when component loads
  useEffect(() => {
    dispatch(fetchOneCustomer(id));
  }, [dispatch, id]);
  
  // Country select

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generic field change

  // Toggle edit mode for address label
  const toggleEditLabel = (index, save = false) => {
    const updated = [...customer.addresses];
    updated[index].isEditing = !save && !updated[index].isEditing;
    if (save) updated[index].isEditing = false;
    setCustomer({ ...customer, addresses: updated });
  };

  // Handle label change while editing
  const handleAddressLabelChange = (e, index) => {
    const updated = [...customer.addresses];
    updated[index].label = e.target.value;
    setCustomer({ ...customer, addresses: updated });
  };

  // Handle address value change
  const handleAddressValueChange = (e, index) => {
    const updated = [...customer.addresses];
    updated[index].value = e.target.value;
    setCustomer({ ...customer, addresses: updated });
  };

  // Add new address
  const addAddress = () => {
    setCustomer((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          label: `Address ${prev.addresses.length + 1}`,
          value: "",
          isEditing: false,
        },
      ],
    }));
  };

  // Remove address
  const removeAddress = (index) => {
    setCustomer((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateForm = (name, value) => {
    let error = "";
    switch (name) {
      case "companyName":
        if (value.length > 64)
          error = "Company name cannot exceed 64 characters.";
        else if (!/^[A-Za-z.\s]*$/.test(value))
          error = "Only alphabets, spaces and '.' are allowed.";
        break;
      case "customerName":
        if (!value) error = "Customer name is required";
      case "country":
        if (!value) error = "Country is required";
      case "phone":
        if (!value) {
          error = "Phone number is required.";
        } else if (value.length > 15) {
          error = "Phone number cannot exceed 15 digits.";
        }
        break;

      case "email":
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
    setCustomer({ ...customer, [name]: value });
    validateForm(name, value);
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

    // Allow only numbers — remove anything else
    value = value.replace(/\D/g, "");

    setCustomer((prev) => ({ ...prev, phone: value }));
    validateForm("phone", value);
    if (inputErrors[name]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSelect = (country) => {
    validateForm("country", country.code);
    const selectedCountry = countriesData.countries.find(
      (c) => c.code === country.code
    );

    setSelected(selectedCountry);
    setCustomer({
      ...customer,

      country: selectedCountry.country,
      countryCode: selectedCountry.code,
    });
    setOpen(false);
    setQuery("");
    if (inputErrors["country"]) {
      setInputErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated["country"];
        return updated;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!customer.customerName.trim())
      newErrors.customerName = "Customer name is required";
    if (!customer.country.trim()) newErrors.country = "Country is required";
    if (!customer.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!customer.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
    if (customer.addresses.every((addr) => !addr.value.trim()))
      newErrors.address = "At least one address is required";
    if (!customer.phone.trim()) newErrors.phone = "Phone number is required";
    if (!customer.email.trim()) newErrors.email = "Email is required";

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
    toast.success("Customer created successfully!");
    console.log(customer);
    setCustomer({
      ...initialCustomer,
      addresses: initialCustomer.addresses.map((addr) => ({ ...addr })),
    });
    setSelected("");
  };

  const handleNavToCustomers = () => {
    nav("/customers");
  };
  const filteredCountries = countriesData?.countries?.filter((country) =>
    country.country.toLowerCase().includes(query.toLowerCase())
  );
  const onEdit = () => {
    nav(`/customers/editCustomer/${id}`);
  };

useEffect(() => {
  if (currentCustomer) {
    setCustomer((prev) => ({
      ...prev,
      customerName: currentCustomer.customerName || "",
      companyName: currentCustomer.companyName || "",
      gstIN: currentCustomer.gstIN || "",
      
      phone: currentCustomer.phone || "",
      email: currentCustomer.email || "",
      addresses: currentCustomer.addresses?.length
        ? currentCustomer.addresses
        : prev.addresses,
    }));
    
    const foundCountry = countriesData.countries.find(
      (c) =>
        c.country === currentCustomer.country ||
        c.code === currentCustomer.countryCode
    );

    if (foundCountry) setSelected(foundCountry);
 


}
}, [id, currentCustomer]);

  return (
    <div className="relative">
      {/* Fixed Buttons */}
      <div className="sticky top-[88px] w-full sm:w-[90%] md:w-full lg:w-full xl:max-w-6x z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="">
          <div className="flex justify-between">
            <div className="px-4 py-2">
              <ArrowLeft
                strokeWidth={1}
                className=" cursor-pointer"
                onClick={handleNavToCustomers}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 mr-5">
              {/* <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={handleSubmit}
              >
                💾 Save
              </button> */}
              <button 
               onClick={onEdit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto">
                ⬇️ Edit
              </button>
              {/* <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                onClick={handleSubmit}
              >
                ✉️ Create
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
          Customer Details
        </h2>

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
            //   onChange={handleChange}
             disabled
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
            {inputErrors.customerName && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.customerName}
              </p>
            )}
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
            //   onChange={handleChange}
             disabled
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter company name"
            />
            {inputErrors.companyName && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.companyName}
              </p>
            )}
            {errors.companyName && (
              <p className="absolute text-[13px] text-[#f10404]">
                {errors.companyName}
              </p>
            )}
          </div>

          {/* GSTIN */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">
              GSTIN *
            </label>
            <input
              type="text"
              name="gstIN"
              value={customer.gstIN}
            //   onChange={handleChange}
             disabled
            
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter GSTIN"
            />
            {inputErrors.gstIN && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.gstIN}
              </p>
            )}
            {errors.gstIN && (
              <p className="absolute text-[13px] text-[#f10404]">
                {errors.gstIN}
              </p>
            )}
          </div>

          {/* Country */}

          <div className="relative w-full" ref={dropdownRef}>
            <label className="block text-gray-700 font-medium mb-1">
              Country *
            </label>

            <button
              type="button"
            //   onClick={() => setOpen(!open)}
            disabled
              className="border border-gray-300 rounded-md px-3 py-2 w-full text-left focus:ring-1 focus:ring-black"
            >
              {selected ? `${selected.country}` : "Select country"}
            </button>

            {open && (
              <div className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full shadow-md max-h-64 overflow-hidden">
                <div className="flex items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <Search className="h-4 w-4 text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>

                {/* Country List */}
                <ul className="max-h-56 overflow-y-auto">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country, index) => (
                      <li
                        key={index}
                        onClick={() => handleSelect(country)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      >
                        <img
                          src={country.flag}
                          alt={country.country}
                          className="rounded-sm object-contain h-5 w-6"
                        />
                        <span>{country.country}</span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-gray-500 text-sm">
                      No results found
                    </li>
                  )}
                </ul>
              </div>
            )}
            {inputErrors.country && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.country}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">
              Phone Number *
            </label>
            <div className="flex">
              {selected?.code && (
                <div
                  className="px-4 w-18
              
              text-gray-900 bg-gray-100  border border-gray-300
              flex justify-center  items-center font-medium rounded-tl-md rounded-bl-md"
                >
                  {selected?.code}
                </div>
              )}

              <input
                type="text"
                name="phone"
                value={customer.phone}
                // onChange={handlePhoneChange}
                disabled
                className={`border border-gray-300 
              ${
                (selected?.code && "rounded-tr-md rounded-br-md ") ||
                "rounded-md"
              }
              
              px-3 py-2 w-full focus:ring-1 focus:ring-blue-500`}
                placeholder="Enter phone number"
              />
            </div>
            {inputErrors.phone && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.phone}
              </p>
            )}
            {errors.phone && (
              <p className="absolute text-[13px] text-[#f10404]">
                {errors.phone}
              </p>
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
            //   onChange={handleChange}
             disabled

              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer email"
            />
            {inputErrors.email && (
              <p className="absolute text-[13px] text-[#f10404]">
                {inputErrors.email}
              </p>
            )}
            {errors.email && (
              <p className="absolute text-[13px] text-[#f10404]">
                {errors.email}
              </p>
            )}
          </div>

          {/* Addresses */}
          <div className="relative col-span-2">
            <label className="block text-gray-700 font-medium mb-1">
              Addresses *
            </label>

            {customer.addresses.map((addr, index) => (
              <div
                key={index}
                className="mb-4 relative border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  {/* Label display / edit */}
                  <div className="flex items-center gap-2">
                    {!addr.isEditing ? (
                      <>
                        <h4 className="text-sm font-semibold text-gray-700">
                          {addr.label}
                        </h4>
                        <button
                          type="button"
                        //   onClick={() => toggleEditLabel(index)}
                         disabled

                          className="text-gray-500 hover:text-blue-600"
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={addr.label}
                        //   onChange={(e) => handleAddressLabelChange(e, index)}
                          disabled

                          className="text-sm border-b border-gray-400 focus:border-blue-500 outline-none bg-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                        //   onClick={() => toggleEditLabel(index, true)}
                        disabled
                          className="text-green-600 hover:text-green-700"
                        >
                          <Save size={16} />
                        </button>
                      </>
                    )}
                  </div>

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

                {/* Address textarea */}
                <textarea
                  name={`address_${index}`}
                  value={addr.value}
                //   onChange={(e) => handleAddressValueChange(e, index)}
             disabled

                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                  placeholder={`Enter ${addr.label.toLowerCase()}`}
                />
              </div>
            ))}

            {/* <button
              type="button"
            //   onClick={addAddress}
             disabled

              className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-800 mt-2"
            >
              ➕ Add another address
            </button> */}

            {inputErrors.address && (
              <p className="absolute text-[13px] text-[#f10404] mt-1">
                {inputErrors.address}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
