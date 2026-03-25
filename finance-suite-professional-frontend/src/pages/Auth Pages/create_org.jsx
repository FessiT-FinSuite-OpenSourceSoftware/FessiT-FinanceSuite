import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Search } from "lucide-react";
import { toast } from "react-toastify";
import { countriesData } from "../../utils/countriesData";
import { useDispatch } from "react-redux";
import { createOrganisation } from "../../ReduxApi/organisation";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/FessitLogoTrans.png";

const initialData = {
  organizationName: "",
  companyName: "",
  gstIN: "",
  addresses: [{ label: "Primary Address", value: "" }],
  country: "",
  countryCode: "",
  phone: "",
  email: "",
  invoicePrefix: "",
  startingInvoiceNo: "1001",
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
  paymentTerms: "30",
  taxRegime: "GST",
  taxType: "exclusive",
  newUserName: "",
  newUserEmail: "",
  newUserPassword: "",
};

const steps = [
  { id: 1, title: "Organization", description: "Basic organization details" },
  { id: 2, title: "Invoice Settings", description: "Configure invoice preferences" },
  { id: 3, title: "Tax Settings", description: "Set up tax configuration" },
  { id: 4, title: "Admin User", description: "Create admin user account" },
];

export default function CreateOrganization() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.organizationName.trim()) newErrors.organizationName = "Organization name is required";
        if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
        if (!formData.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
        if (!formData.country.trim()) newErrors.country = "Country is required";
        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        if (formData.addresses.every(addr => !addr.value.trim())) newErrors.address = "At least one address is required";
        break;
      case 2:
        if (!formData.invoicePrefix.trim()) newErrors.invoicePrefix = "Invoice prefix is required";
        if (!formData.startingInvoiceNo.trim()) newErrors.startingInvoiceNo = "Starting invoice number is required";
        break;
      case 4:
        if (!formData.newUserName.trim()) newErrors.newUserName = "Admin name is required";
        if (!formData.newUserEmail.trim()) newErrors.newUserEmail = "Admin email is required";
        if (!formData.newUserPassword.trim()) newErrors.newUserPassword = "Admin password is required";
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, phone: value });
    if (errors.phone) {
      setErrors({ ...errors, phone: "" });
    }
  };

  const handleSelect = (country) => {
    const selectedCountry = countriesData.countries.find(c => c.code === country.code);
    setSelected(selectedCountry);
    setFormData({
      ...formData,
      country: selectedCountry.country,
      countryCode: selectedCountry.code,
    });
    setOpen(false);
    setQuery("");
    if (errors.country) {
      setErrors({ ...errors, country: "" });
    }
  };

  const handleAddressChange = (e, index) => {
    const updated = [...formData.addresses];
    updated[index].value = e.target.value;
    setFormData({ ...formData, addresses: updated });
    if (errors.address) {
      setErrors({ ...errors, address: "" });
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      const mappedData = {
        organizationName: formData.organizationName,
        companyName: formData.companyName,
        gstIN: formData.gstIN,
        addresses: formData.addresses,
        country: formData.country,
        countryCode: formData.countryCode,
        phone: formData.phone,
        email: formData.email,
        // Invoice settings
        invoice_prefix: formData.invoicePrefix,
        starting_invoice_no: formData.startingInvoiceNo,
        date_format: formData.dateFormat,
        currency: formData.currency,
        payment_terms: formData.paymentTerms,
        late_payment_fee: "",
        early_discount: "",
        discount_days: "",
        payment_instructions: "",
        account_holder: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        upi_id: "",
        footer_note: "",
        // Tax settings
        tax_regime: formData.taxRegime,
        tax_type: formData.taxType,
        cgst: "",
        sgst: "",
        igst: "",
        input_tax_credit: "",
        require_hsn: "",
        rounding_rule: "",
        tax_notes: "",
        // Admin user
        new_user_name: formData.newUserName,
        new_user_email: formData.newUserEmail,
        new_user_password: formData.newUserPassword,
        new_user_role: "Admin",
        new_user_status: "Active",
        permissions: {
          Admin: { view: true, edit: true, delete: true, export: true },
          Manager: { view: true, edit: true, delete: false, export: true },
          Accountant: { view: true, edit: true, delete: false, export: false },
          Viewer: { view: true, edit: false, delete: false, export: false },
          Custom: { view: false, edit: false, delete: false, export: false },
        },
        // Payment methods
        enabled_methods: { bankTransfer: false, upi: false, card: false, paypal: false, cash: false },
        payment_bank_name: "",
        payment_account_no: "",
        payment_ifsc: "",
        payment_account_holder: "",
        payment_upi_id: "",
        paypal_email: "",
        paypal_client_id: "",
        card_provider: "",
        card_api_key: "",
        cash_instructions: "",
        custom_payment_name: "",
      };

      await dispatch(createOrganisation(mappedData));
      toast.success("Organization created successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Create failed:", error);
      toast.error("Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCountries = countriesData?.countries?.filter(country =>
    country.country.toLowerCase().includes(query.toLowerCase())
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter organization name"
                />
                {errors.organizationName && <p className="text-xs text-red-600 mt-1">{errors.organizationName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                />
                {errors.companyName && <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  name="gstIN"
                  value={formData.gstIN}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter GSTIN"
                />
                {errors.gstIN && <p className="text-xs text-red-600 mt-1">{errors.gstIN}</p>}
              </div>

              <div ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {selected ? selected.country : "Select country"}
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
                    <ul className="max-h-56 overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country, index) => (
                          <li
                            key={index}
                            onClick={() => handleSelect(country)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          >
                            <img src={country.flag} alt={country.country} className="rounded-sm object-contain h-5 w-6" />
                            <span>{country.country}</span>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-2 text-gray-500 text-sm">No results found</li>
                      )}
                    </ul>
                  </div>
                )}
                {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="flex">
                  {selected?.code && (
                    <div className="px-4 text-gray-900 bg-gray-100 border border-gray-300 flex justify-center items-center font-medium rounded-l-md">
                      {selected.code}
                    </div>
                  )}
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`px-3 py-2 border border-gray-300 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${selected?.code ? 'rounded-r-md' : 'rounded-md'}`}
                    placeholder="Enter phone number"
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter organization email"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Address *</label>
              <textarea
                value={formData.addresses[0].value}
                onChange={(e) => handleAddressChange(e, 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                placeholder="Enter primary address"
              />
              {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix *</label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., INV"
                />
                {errors.invoicePrefix && <p className="text-xs text-red-600 mt-1">{errors.invoicePrefix}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Invoice Number *</label>
                <input
                  type="number"
                  name="startingInvoiceNo"
                  value={formData.startingInvoiceNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1001"
                />
                {errors.startingInvoiceNo && <p className="text-xs text-red-600 mt-1">{errors.startingInvoiceNo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                <select
                  name="dateFormat"
                  value={formData.dateFormat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                  <option value="GBP">£ British Pound (GBP)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">Due on Receipt</option>
                  <option value="7">Net 7 Days</option>
                  <option value="15">Net 15 Days</option>
                  <option value="30">Net 30 Days</option>
                  <option value="45">Net 45 Days</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Regime</label>
                <select
                  name="taxRegime"
                  value={formData.taxRegime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GST">GST (India)</option>
                  <option value="VAT">VAT (Other Regions)</option>
                  <option value="None">No Tax / Non-Registered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                <select
                  name="taxType"
                  value={formData.taxType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="exclusive">Tax Exclusive (Added on top)</option>
                  <option value="inclusive">Tax Inclusive (Included in price)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  name="newUserName"
                  value={formData.newUserName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter admin full name"
                />
                {errors.newUserName && <p className="text-xs text-red-600 mt-1">{errors.newUserName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                <input
                  type="email"
                  name="newUserEmail"
                  value={formData.newUserEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter admin email address"
                />
                {errors.newUserEmail && <p className="text-xs text-red-600 mt-1">{errors.newUserEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
                <input
                  type="password"
                  name="newUserPassword"
                  value={formData.newUserPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter admin password"
                />
                {errors.newUserPassword && <p className="text-xs text-red-600 mt-1">{errors.newUserPassword}</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <img src={Logo} alt="FessiT Logo" className="h-20 w-20 object-contain mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Create Organization</h2>
          <p className="text-sm text-gray-600 mt-2">Set up your finance suite organization</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep > step.id ? 'bg-green-500 border-green-500 text-white' :
                currentStep === step.id ? 'bg-blue-500 border-blue-500 text-white' :
                'bg-white border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <div className="ml-3 text-left">
                <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{steps[currentStep - 1].title}</h3>
          
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center px-4 py-2 rounded-md ${
                currentStep === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`px-6 py-2 rounded-md text-white ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoading ? 'Creating...' : 'Create Organization'}
              </button>
            )}
          </div>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an organization?{" "}
            <button
              onClick={() => navigate("/login")}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}