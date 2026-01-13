import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
// import { countries } from "../../shared/countries";
import { Mail, Phone } from "lucide-react";
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
  isActive:""
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
      isActive:currentCustomer?.isActive||"",
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
console.log(currentCustomer)
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

      {/* Customer Summary */}
      <div className="bg-white rounded-lg shadow-lg p-8 mt-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b">Customer Details</h2>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{customer.customerName || 'N/A'}</h1>
          <p className="text-xl text-gray-600 mt-1">{customer.companyName || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs uppercase text-blue-600 font-semibold mb-1">GSTIN</p>
            <p className="text-lg font-bold text-gray-900">{customer.gstIN || 'N/A'}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs uppercase text-green-600 font-semibold mb-1">Country</p>
            <p className="text-lg font-bold text-gray-900">{selected?.country || 'N/A'}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs uppercase text-purple-600 font-semibold mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${customer.isActive === 'Active' ? 'bg-green-100 text-green-800' : customer.isActive === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
              {customer.isActive || 'N/A'}
            </span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Mail strokeWidth={1} className="w-5 h-5 text-black mt-1" />
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-base font-medium text-gray-900">{customer.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone strokeWidth={1} className="w-5 h-5 text-black mt-1" />
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="text-base font-medium text-gray-900">{selected?.code} {customer.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Addresses</h2>
          <div className="space-y-4">
            {customer.addresses.map((addr, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-600 mb-1">{addr.label}</p>
                <p className="text-gray-700">{addr.value || 'No address provided'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
