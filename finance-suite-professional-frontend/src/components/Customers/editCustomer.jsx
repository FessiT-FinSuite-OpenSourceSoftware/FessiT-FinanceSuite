import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Pencil, Save, X } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { countriesData } from "../../utils/countriesData";
import { useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  customerSelector,
  fetchOneCustomer,
  updateCustomerData,
} from "../../ReduxApi/customer";

const emptyProject = { projectName: "", projectOwner: "", owner_email: "", description: "" };

function ProjectModal({ project, existingProjects, onSave, onClose }) {
  const [form, setForm] = useState(project ? { ...project } : { ...emptyProject });
  const [nameError, setNameError] = useState('');
  const handleSave = () => {
    if (!form.projectName.trim() || !form.projectOwner.trim()) {
      toast.error("Project name and owner are required");
      return;
    }
    const isDuplicate = existingProjects
      .some(p => p.projectName.trim().toLowerCase() === form.projectName.trim().toLowerCase());
    if (isDuplicate) { setNameError('A project with this name already exists'); return; }
    setNameError('');
    onSave(form);
  };
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">{project ? "Edit Project" : "Add Project"}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-gray-800" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project name" value={form.projectName} onChange={e => { setForm(p => ({ ...p, projectName: e.target.value })); setNameError(''); }} />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Owner *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project owner" value={form.projectOwner} onChange={e => setForm(p => ({ ...p, projectOwner: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Owner Email</label>
            <input type="email" className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter owner email" value={form.owner_email || ""} onChange={e => setForm(p => ({ ...p, owner_email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-gray-400">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700">{project ? "Update" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}
const initialCustomer = {
  customerName: "",
  companyName: "",
  gstIN: "",
  CustomerCode: "",
  addresses: [{ label: "Primary Address", value: "", isEditing: false }],
  country: "",
  countryCode: "",
  phone: "",
  email: "",
  isActive: "",
  isvendor: false,
  projects: [],
};

export default function EditCustomer() {
  const [customer, setCustomer] = useState(initialCustomer);
  const [inputErrors, setInputErrors] = useState({});
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState({});
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);

  const dispatch = useDispatch();
  const { id } = useParams();
  const { currentCustomer } = useSelector(customerSelector);
  console.log(currentCustomer);

  useEffect(() => {
    dispatch(fetchOneCustomer (id));
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

  // ✅ valid form, dispatch update
  dispatch(updateCustomerData( id, customer )); // <-- pass properly
  nav("/customers");
  setInputErrors({});
};

  const handleNavToCustomers = () => {
    nav("/customers");
  };
  const filteredCountries = countriesData?.countries?.filter((country) =>
    country.country.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (currentCustomer) {
      setCustomer((prev) => ({
        ...prev,
        customerName: currentCustomer.customerName || "",
        companyName: currentCustomer.companyName || "",
        gstIN: currentCustomer.gstIN || "",
        CustomerCode: currentCustomer.CustomerCode || "",
        country: currentCustomer.country || "",
        phone: currentCustomer.phone || "",
        email: currentCustomer.email || "",
        isActive: currentCustomer.isActive || "",
        isvendor: currentCustomer.isvendor ?? currentCustomer.is_vendor_too ?? false,
        projects: currentCustomer.projects || [],
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

      setInputErrors({});
    }
  }, [id, currentCustomer]);

  const [projectModal, setProjectModal] = useState(null);

  const openAddProject = () => setProjectModal({ mode: "add" });
  const openEditProject = (index) => setProjectModal({ mode: "edit", index });
  const closeProjectModal = () => setProjectModal(null);

  const handleProjectSave = (form) => {
    if (projectModal.mode === "add") {
      setCustomer((prev) => ({ ...prev, projects: [...prev.projects, form] }));
    } else {
      setCustomer((prev) => {
        const updated = [...prev.projects];
        updated[projectModal.index] = form;
        return { ...prev, projects: updated };
      });
    }
    closeProjectModal();
  };

  const removeProject = (index) => {
    setCustomer((prev) => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }));
  };

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
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                onClick={handleSubmit}
              >
                Save
              </button> */}
              {/* <button 
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
 >                Edit
              </button> */}
              <button
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 w-full sm:w-auto hover:border-blue-500 hover:shadow-md hover:-translate-y-px transition-all duration-200 hover:text-blue-600"
                onClick={handleSubmit}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6 mt-10">
      <div className=" flex justify-between border-b mb-4 border-gray-300 ">
          <h2 className="text-lg font-semibold text-gray-800 pb-2">
          Customer Details
        

        </h2>
        <div className="flex justify-end gap-3">
          <div className="flex ">
             <p className="text-sm font-bold flex items-center">Current status :- </p>

         <span className={`text-xs px-2 py-1 font-semibold flex justify-center items-center
          ${customer?.isActive==="New"&&" text-red-800"}
          ${customer?.isActive==="Pending"&&" text-yellow-800"}
          ${customer?.isActive==="Active"&&" text-green-800"}

          
          `}>{customer?.isActive}</span>
          </div>

          <div className="flex justify-center items-center">
            <select className=" bg-gray-100 px-3 py-2 rounded-sm text-sm "
             onChange={(e) => setCustomer((prev) => ({ ...prev, isActive: e.target.value }))}
             name="isActive"
             value={customer?.isActive}
            >
              <option value="">Change status</option>
              <option value="New">New</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
            
            </select>
          </div>
        </div>
      </div>
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
              onChange={handleChange}
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
              onChange={handleChange}
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

          {/* Customer Code */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">
              Customer Code
            </label>
            <input
              type="text"
              name="CustomerCode"
              value={customer.CustomerCode}
              onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer code"
            />
          </div>

          {/* Country */}

          <div className="relative w-full" ref={dropdownRef}>
            <label className="block text-gray-700 font-medium mb-1">
              Country *
            </label>

            <button
              type="button"
              onClick={() => setOpen(!open)}
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
                onChange={handlePhoneChange}
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
            <label className="block text-gray-700 font-medium mb-1">Email *</label>
            <input type="email" name="email" value={customer.email} onChange={handleChange} className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500" placeholder="Enter customer email" />
            {(inputErrors.email || errors.email) && <p className="absolute text-[13px] text-[#f10404]">{inputErrors.email || errors.email}</p>}
          </div>

          {/* Is Vendor */}
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="isvendor" name="isvendor" checked={customer.isvendor} onChange={(e) => setCustomer((prev) => ({ ...prev, isvendor: e.target.checked }))} className="w-4 h-4 cursor-pointer accent-blue-600" />
            <label htmlFor="isvendor" className="text-sm font-semibold text-gray-700 cursor-pointer">Is Vendor</label>
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
                          onClick={() => toggleEditLabel(index)}
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
                          onChange={(e) => handleAddressLabelChange(e, index)}
                          className="text-sm border-b border-gray-400 focus:border-blue-500 outline-none bg-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => toggleEditLabel(index, true)}
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
                  onChange={(e) => handleAddressValueChange(e, index)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                  placeholder={`Enter ${addr.label.toLowerCase()}`}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addAddress}
              className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-800 mt-2"
            >
              Add another address
            </button>

            {inputErrors.address && (
              <p className="absolute text-[13px] text-[#f10404] mt-1">
                {inputErrors.address}
              </p>
            )}
          </div>
          {/* Projects */}
          <div className="relative col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 font-medium">Projects</label>
              <button type="button" onClick={openAddProject} className="text-blue-600 text-sm font-medium hover:text-blue-800">+ Add Project</button>
            </div>
            {customer.projects.length > 0 && (
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Project Name</th>
                    <th className="px-3 py-2 text-left">Owner</th>
                    <th className="px-3 py-2 text-left">Owner Email</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.projects.map((proj, index) => (
                    <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{proj.projectName}</td>
                      <td className="px-3 py-2 text-gray-600">{proj.projectOwner}</td>
                      <td className="px-3 py-2 text-gray-500">{proj.owner_email || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{proj.description || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-3">
                          <button type="button" onClick={() => openEditProject(index)} className="text-blue-600 hover:text-blue-800"><Pencil size={14} /></button>
                          <button type="button" onClick={() => removeProject(index)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {projectModal && (
        <ProjectModal
          project={projectModal.mode === "edit" ? customer.projects[projectModal.index] : null}
          existingProjects={projectModal.mode === "edit" ? customer.projects.filter((_, i) => i !== projectModal.index) : customer.projects}
          onSave={handleProjectSave}
          onClose={closeProjectModal}
        />
      )}
    </div>
  );
}
