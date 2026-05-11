import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { toast } from "react-toastify";
import { countriesData } from "../../utils/countriesData";
import { Eye, Pencil, Save, Search, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import axiosInstance from "../../utils/axiosInstance";
import { createOrganisation, fetchOrganisationByEmail, fetchOneOrganisation, orgamisationSelector, updateOrganisationData, clearLoading, uploadOrgLogo } from "../../ReduxApi/organisation";
import ServicesTab from "./ServicesTab";
import Products from "./products";
import TdsReferenceAccordion from "./TdsReferenceAccordion";


async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function LogoCropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleConfirm = useCallback(async () => {
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    onConfirm(blob);
  }, [imageSrc, croppedAreaPixels, onConfirm]);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Crop logo</h3>
          <button onClick={onCancel} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full bg-black" style={{ height: 300 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: { border: "none", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", borderRadius: 4 },
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Scroll to zoom &middot; Drag to reposition</p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-1.5 text-sm rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleConfirm} className="px-4 py-1.5 text-sm rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const initialSettings = {
  organizationName: "",
  companyName: "",
  gstIN: "",
  addresses: [{ label: "Primary Address", value: "", isEditing: false }],

  country: "",
  countryCode: "",
  phone: "",
  email: "",
  // --- Invoice Settings ---
  invoicePrefix: "",
  startingInvoiceNo: "",
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
  newUserPassword: "",
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
  services: [],
  lut: "",
  iec: "",
  accountType: "",
  bankBranch: "",
  swiftCode: "",
};

const mapServicePayload = (service) => ({
  _id: service.id || service._id || undefined,
  serviceName: service.serviceName,
  serviceDescription: service.serviceDescription,
  serviceAmount: parseFloat(service.serviceAmount) || 0,
});

const findDuplicateServiceName = (services) => {
  const seen = new Set();
  for (const service of services) {
    const name = (service?.serviceName || "").trim().toLowerCase();
    if (!name) continue;
    if (seen.has(name)) return service.serviceName.trim();
    seen.add(name);
  }
  return null;
};

export default function SettingsCreation() {
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState("organization");
  const [isEditing, setIsEditing] = useState(false);
  const { currentOrganisation, isLoading, isError } = useSelector(orgamisationSelector);
  const [orgId, setOrgID] = useState(null);
  const [emailDisable, setEmailDisable] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoPreviewOpen, setIsLogoPreviewOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const dispatch = useDispatch();

  // Debug logging
  console.log('Settings component - isLoading:', isLoading, 'currentOrganisation:', !!currentOrganisation);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadOrganisation = async () => {
      const email = localStorage.getItem("email");

      if (!email) return;

      try {
        setEmailDisable(true);
        // Use Redux action instead of direct API call
        await dispatch(fetchOrganisationByEmail(email));
      } catch (error) {
        console.error("Failed to fetch organisation:", error);
        setEmailDisable(false);
      }
    };

    // Only load if we don't already have the data
    if (!currentOrganisation) {
      loadOrganisation();
    }
  }, [dispatch, currentOrganisation]);

  const validateForm = (name, value) => {
    let error = "";
    switch (name) {
      case "organizationName":
        if (value.length > 64)
          error = "Organization name cannot exceed 64 characters.";
        else if (!/^[A-Za-z.\s]*$/.test(value))
          error = "Only alphabets, spaces and '.' are allowed.";
        else if (!value) error = "Organization name is required.";

        break;
      case "companyName":
        if (value.length > 64)
          error = "Company name cannot exceed 64 characters.";
        else if (!/^[A-Za-z.\s]*$/.test(value))
          error = "Only alphabets, spaces and '.' are allowed.";
        else if (!value) error = "Company name is required.";

        break;

      case "country":
        if (!value) error = "Country is required";
      case "phone":
        if (!value) {
          error = "Phone number is required.";
        } else if (value.length > 15) {
          error = "Phone number cannot exceed 15 digits.";
        } else if (selected?.phone instanceof RegExp && !selected?.phone?.test(value)) {
          error = `Invalid phone number for ${selected?.country}.`;

        }
        break;

      case "email":
        if (value && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value))
          error = "Invalid email address.";
        else if (!value) error = "Organiztion email is required";
        break;

      case "gstIN":
        if (!/^[A-Za-z0-9]*$/.test(value))
          error = "GSTIN must be alphanumeric only.";
        else if (value.length > 15)
          error = "GSTIN should not exceed 15 characters.";
        else if (!value) error = "GSTIN is required.";

        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Generic field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
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

    setSettings((prev) => ({ ...prev, phone: value }));
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
    setSettings({
      ...settings,

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

  const toggleEditLabel = (index, save = false) => {
    const updated = [...settings.addresses];
    updated[index].isEditing = !save && !updated[index].isEditing;
    if (save) updated[index].isEditing = false;
    setSettings({ ...settings, addresses: updated });
  };

  const handleAddressLabelChange = (e, index) => {
    const updated = [...settings.addresses];
    updated[index].label = e.target.value;
    setSettings({ ...settings, addresses: updated });
  };

  // Handle address changes
  const handleAddressChange = (e, index) => {
    const updated = [...settings.addresses];
    updated[index].value = e.target.value;
    setSettings({ ...settings, addresses: updated });
  };

  // Add new address
  const addAddress = () => {
    setSettings((prev) => ({
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

  // Remove an address
  const removeAddress = (index) => {
    setSettings((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  const handleUpdate = async () => {
    const newErrors = {};
    if (!settings.organizationName.trim())
      newErrors.organizationName = "Organization name is required";
    if (!settings.country.trim()) newErrors.country = "Country is required";
    if (!settings.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!settings.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
    if (settings.addresses.every((addr) => !addr?.value?.trim()))
      newErrors.address = "At least one address is required";
    if (!settings.phone.trim()) newErrors.phone = "Phone number is required";
    if (!settings.email.trim()) newErrors.email = "Email is required";

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      return;
    }

    setInputErrors({});

    const duplicateServiceName = findDuplicateServiceName(settings.services);
    if (duplicateServiceName) {
      toast.error(`Service name "${duplicateServiceName}" must be unique`);
      return;
    }

    const updateData = {
      organizationName: settings.organizationName,
      companyName: settings.companyName,
      gstIN: settings.gstIN,
      addresses: settings.addresses,
      country: settings.country,
      countryCode: settings.countryCode,
      phone: settings.phone,
      email: settings.email,
      invoice_prefix: settings.invoicePrefix,
      starting_invoice_no: settings.startingInvoiceNo,
      date_format: settings.dateFormat,
      currency: settings.currency,
      payment_terms: settings.paymentTerms,
      late_payment_fee: settings.latePaymentFee,
      early_discount: settings.earlyDiscount,
      discount_days: settings.discountDays,
      payment_instructions: settings.paymentInstructions,
      account_holder: settings.accountHolder,
      bank_name: settings.bankName,
      account_number: settings.accountNumber,
      ifsc_code: settings.ifscCode,
      upi_id: settings.upiId,
      footer_note: settings.footerNote,
      tax_regime: settings.taxRegime,
      tax_type: settings.taxType,
      cgst: settings.cgst,
      sgst: settings.sgst,
      igst: settings.igst,
      input_tax_credit: settings.inputTaxCredit,
      require_hsn: settings.requireHSN,
      rounding_rule: settings.roundingRule,
      tax_notes: settings.taxNotes,
      enabled_methods: settings.enabledMethods,
      payment_bank_name: settings.paymentBankName,
      payment_account_no: settings.paymentAccountNo,
      payment_ifsc: settings.paymentIFSC,
      payment_account_holder: settings.paymentAccountHolder,
      payment_upi_id: settings.paymentUpiId,
      paypal_email: settings.paypalEmail,
      paypal_client_id: settings.paypalClientId,
      card_provider: settings.cardProvider,
      card_api_key: settings.cardApiKey,
      cash_instructions: settings.cashInstructions,
      custom_payment_name: settings.customPaymentName,
      lut: settings.lut,
      iec: settings.iec,
      accountType: settings.accountType,
      bankBranch: settings.bankBranch,
      swiftCode: settings.swiftCode,
      new_user_name: settings.newUserName,
      new_user_email: settings.newUserEmail,
      new_user_password: settings.newUserPassword,
      new_user_role: settings.newUserRole,
      new_user_status: settings.newUserStatus,
      permissions: settings.permissions,
      services: settings.services.map(mapServicePayload),
    };

    console.log('Sending update data:', updateData);
    console.log('Organization ID:', orgId);

    try {
      await dispatch(updateOrganisationData(orgId, updateData))
      localStorage.setItem("email", settings.email)
      await dispatch(fetchOrganisationByEmail(settings.email, true))
      // Force clear loading state after successful update
      setTimeout(() => {
        dispatch(clearLoading())
      }, 100)
    } catch (error) {
      console.error('Update failed:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Update failed: ' + (error.response?.data?.message || error.message));
      // Clear loading state on error too
      dispatch(clearLoading())
    }
  };

  const handleOrganisationSubmit = async (e) => {
    console.log("first")
    e.preventDefault();

    const newErrors = {};
    if (!settings.organizationName.trim())
      newErrors.organizationName = "Organization name is required";
    if (!settings.country.trim()) newErrors.country = "Country is required";
    if (!settings.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!settings.gstIN.trim()) newErrors.gstIN = "GSTIN is required";
    if (settings.addresses.every((addr) => !addr?.value?.trim()))
      newErrors.address = "At least one address is required";
    if (!settings.phone.trim()) newErrors.phone = "Phone number is required";
    if (!settings.email.trim()) newErrors.email = "Email is required";

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

    const duplicateServiceName = findDuplicateServiceName(settings.services);
    if (duplicateServiceName) {
      toast.error(`Service name "${duplicateServiceName}" must be unique`);
      return;
    }

    // Map frontend field names to backend expected field names
    const mappedSettings = {
      organizationName: settings.organizationName,
      companyName: settings.companyName,
      gstIN: settings.gstIN,
      addresses: settings.addresses,
      country: settings.country,
      countryCode: settings.countryCode,
      phone: settings.phone,
      email: settings.email,
      // Invoice fields - use snake_case to match backend expectations
      invoice_prefix: settings.invoicePrefix,
      starting_invoice_no: settings.startingInvoiceNo,
      date_format: settings.dateFormat,
      currency: settings.currency,
      payment_terms: settings.paymentTerms,
      late_payment_fee: settings.latePaymentFee,
      early_discount: settings.earlyDiscount,
      discount_days: settings.discountDays,
      payment_instructions: settings.paymentInstructions,
      account_holder: settings.accountHolder,
      bank_name: settings.bankName,
      account_number: settings.accountNumber,
      ifsc_code: settings.ifscCode,
      upi_id: settings.upiId,
      footer_note: settings.footerNote,
      // Tax fields - use snake_case to match backend expectations
      tax_regime: settings.taxRegime,
      tax_type: settings.taxType,
      cgst: settings.cgst,
      sgst: settings.sgst,
      igst: settings.igst,
      input_tax_credit: settings.inputTaxCredit,
      require_hsn: settings.requireHSN,
      rounding_rule: settings.roundingRule,
      tax_notes: settings.taxNotes,
      // Payment fields - use snake_case to match backend expectations
      enabled_methods: settings.enabledMethods,
      payment_bank_name: settings.paymentBankName,
      payment_account_no: settings.paymentAccountNo,
      payment_ifsc: settings.paymentIFSC,
      payment_account_holder: settings.paymentAccountHolder,
      payment_upi_id: settings.paymentUpiId,
      paypal_email: settings.paypalEmail,
      paypal_client_id: settings.paypalClientId,
      card_provider: settings.cardProvider,
      card_api_key: settings.cardApiKey,
      cash_instructions: settings.cashInstructions,
      custom_payment_name: settings.customPaymentName,
      lut: settings.lut,
      iec: settings.iec,
      accountType: settings.accountType,
      bankBranch: settings.bankBranch,
      swiftCode: settings.swiftCode,
      // User fields - use snake_case to match backend expectations
      new_user_name: settings.newUserName,
      new_user_email: settings.newUserEmail,
      new_user_password: settings.newUserPassword,
      new_user_role: settings.newUserRole,
      new_user_status: settings.newUserStatus,
      permissions: settings.permissions,
      services: settings.services.map(mapServicePayload),
    };

    if (isEditing) {
      console.log("editing mode")
      console.log("Sending data to API:", mappedSettings)
      console.log("Organization ID:", orgId)
      try {
        await dispatch(updateOrganisationData(orgId, mappedSettings))
        localStorage.setItem("email", settings.email)
        await dispatch(fetchOrganisationByEmail(settings.email, true))
      } catch (error) {
        console.error('Update failed:', error)
      }
    } else {
      console.log('Creating new organisation with data:', mappedSettings)
      try {
        const result = await dispatch(createOrganisation(mappedSettings))
        console.log('Create result:', result)
        localStorage.setItem("email", settings.email)
        console.log('Email stored in localStorage:', settings.email)

        // Set the organization ID and switch to edit mode
        if (result?._id?.$oid) {
          console.log('Setting org ID:', result._id.$oid)
          setOrgID(result._id.$oid)
          setIsEditing(true)
        } else {
          console.warn('No _id.$oid found in result:', result)
        }
      } catch (error) {
        console.error('Create failed:', error)
      }
    }
  };

  const handleSave = (e) => {
    console.log('handleSave called, isEditing:', isEditing)
    console.log('orgId:', orgId)
    handleOrganisationSubmit(e)
  };

  const handleEdit = async () => {
    setIsEditing(true);
    setEmailDisable(true);

    // Only fetch if we don't have current organisation data
    if (!currentOrganisation) {
      try {
        // Use Redux action instead of direct API call
        await dispatch(fetchOrganisationByEmail(localStorage.getItem('email')));
      } catch (error) {
        console.error('Error fetching organisation for edit:', error);
      }
    }
  };
  console.log(currentOrganisation)


  useEffect(() => {
    if (currentOrganisation) {
      // Set the organization ID when we get the data
      if (currentOrganisation._id?.$oid) {
        setOrgID(currentOrganisation._id.$oid);
      } else if (currentOrganisation._id) {
        setOrgID(currentOrganisation._id);
      }

      // Batch all state updates together to avoid multiple re-renders
      const newSettings = {
        ...initialSettings,
        // Organization fields
        organizationName: currentOrganisation?.organizationName || "",
        companyName: currentOrganisation?.companyName || "",
        gstIN: currentOrganisation?.gstIN || "",
        country: currentOrganisation.country || "",
        countryCode: currentOrganisation.countryCode || "",
        phone: currentOrganisation.phone || "",
        email: currentOrganisation.email || "",
        addresses: currentOrganisation.addresses?.length ?
          currentOrganisation.addresses.map(addr => ({
            label: addr.label || "Address",
            value: addr.value || addr,
            isEditing: false
          })) : initialSettings.addresses,
        // Invoice fields
        invoicePrefix: currentOrganisation?.invoicePrefix || "",
        startingInvoiceNo: currentOrganisation?.startingInvoiceNo || "",
        dateFormat: currentOrganisation?.dateFormat || "DD/MM/YYYY",
        currency: currentOrganisation?.currency || "INR",
        paymentTerms: currentOrganisation?.paymentTerms || "30",
        latePaymentFee: currentOrganisation?.latePaymentFee || "",
        earlyDiscount: currentOrganisation?.earlyDiscount || "",
        discountDays: currentOrganisation?.discountDays || "",
        paymentInstructions: currentOrganisation?.paymentInstructions || "",
        accountHolder: currentOrganisation?.accountHolder || "",
        bankName: currentOrganisation?.bankName || "",
        accountNumber: currentOrganisation?.accountNumber || "",
        ifscCode: currentOrganisation?.ifscCode || "",
        upiId: currentOrganisation?.upiId || "",
        footerNote: currentOrganisation?.footerNote || "",
        // Tax fields
        taxRegime: currentOrganisation?.taxRegime || "GST",
        taxType: currentOrganisation?.taxType || "exclusive",
        cgst: currentOrganisation?.cgst || "",
        sgst: currentOrganisation?.sgst || "",
        igst: currentOrganisation?.igst || "",
        inputTaxCredit: currentOrganisation?.inputTaxCredit || "enabled",
        requireHSN: currentOrganisation?.requireHSN || "yes",
        roundingRule: currentOrganisation?.roundingRule || "nearest",
        taxNotes: currentOrganisation?.taxNotes || "",
        // Payment fields
        enabledMethods: currentOrganisation?.enabledMethods || initialSettings.enabledMethods,
        paymentBankName: currentOrganisation?.paymentBankName || "",
        paymentAccountNo: currentOrganisation?.paymentAccountNo || "",
        paymentIFSC: currentOrganisation?.paymentIFSC || "",
        paymentAccountHolder: currentOrganisation?.paymentAccountHolder || "",
        paymentUpiId: currentOrganisation?.paymentUpiId || "",
        paypalEmail: currentOrganisation?.paypalEmail || "",
        paypalClientId: currentOrganisation?.paypalClientId || "",
        cardProvider: currentOrganisation?.cardProvider || "",
        cardApiKey: currentOrganisation?.cardApiKey || "",
        cashInstructions: currentOrganisation?.cashInstructions || "",
        customPaymentName: currentOrganisation?.customPaymentName || "",
        lut: currentOrganisation?.lut || "",
        iec: currentOrganisation?.iec || "",
        accountType: currentOrganisation?.accountType || "",
        bankBranch: currentOrganisation?.bankBranch || "",
        swiftCode: currentOrganisation?.swiftCode || "",
        // Services
        services: (currentOrganisation?.services || []).map((service) => ({
          id: service.id || service._id || undefined,
          _id: service.id || service._id || undefined,
          serviceName: service.serviceName || "",
          serviceDescription: service.serviceDescription || "",
          serviceAmount: service.serviceAmount ?? "",
        })),
        // User fields
        newUserName: currentOrganisation?.newUserName || "",
        newUserEmail: currentOrganisation?.newUserEmail || "",
        newUserPassword: currentOrganisation?.newUserPassword || "",
        newUserRole: currentOrganisation?.newUserRole || "Viewer",
        newUserStatus: currentOrganisation?.newUserStatus || "Active",
        permissions: currentOrganisation?.permissions || initialSettings.permissions,
      };

      setSettings(newSettings);
      setIsEditing(true);
      setEmailDisable(true);

      // Load existing logo preview
      if (currentOrganisation.logo) {
        axiosInstance.get(`/organisation-logo/${currentOrganisation.logo}`, { responseType: 'blob' })
          .then((res) => setLogoPreview(URL.createObjectURL(res.data)))
          .catch(() => { })
      } else {
        setLogoPreview('')
      }

      const foundCountry = countriesData.countries.find(
        (c) =>
          c.country === currentOrganisation.country ||
          c.code === currentOrganisation.countryCode
      );

      if (foundCountry) setSelected(foundCountry);

      setInputErrors({});
    }
  }, [currentOrganisation]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    e.target.value = "";
  }

  const handleCropConfirm = useCallback((blob) => {
    const croppedFile = new File([blob], "logo.png", { type: "image/png" });
    setLogoFile(croppedFile);
    setLogoPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  }, []);

  const handleCropCancel = useCallback(() => setCropSrc(null), []);

  const handleLogoUpload = async () => {
    if (!logoFile || !orgId) return
    await dispatch(uploadOrgLogo(orgId, logoFile))
    setLogoFile(null)
  }

  const openLogoPreview = () => {
    if (!logoPreview) return;
    setIsLogoPreviewOpen(true);
  }

  const handleReset = () => {
    setSettings(initialSettings);
    setEmailDisable(false);
    setIsEditing(false);
    setOrgID(null);
    setErrors({});
    setInputErrors({});
    setSelected(null);
  };
  const filteredCountries = countriesData?.countries?.filter((country) =>
    country.country.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      {cropSrc && (
        <LogoCropModal imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      )}

      {isLogoPreviewOpen && logoPreview && (
        <div className="fixed inset-0 z-300 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsLogoPreviewOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900">Logo Preview</h3>
              <button
                type="button"
                onClick={() => setIsLogoPreviewOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                title="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex min-h-64 items-center justify-center rounded-lg bg-gray-50 p-6">
              <img
                src={logoPreview}
                alt="Organisation logo preview"
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-lg border-g shadow-lg p-8 pb-6">
        {/* Tabs + Action Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <div className="flex">
            {[
              { key: "organization", label: "Organization" },
              { key: "invoice", label: "Invoice Settings" },
              { key: "tax", label: "Tax Settings" },
              { key: "payment", label: "Payment Methods" },
              { key: "services", label: "Services" },

              { key: "users", label: "Users & Roles" },
              // { key: "services", label: "Services" },

            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2 text-md font-medium transition-colors ${activeTab === t.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* // add Logics here , we need to add conditional Rendering here  */}

          {activeTab === "Items" ? <div className="flex gap-2 pb-1">
            {/* <button className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Add Product
            </button> */}
            {/* <button className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Add Category
            </button> */}
          </div> :
            <div className="flex gap-2 pb-1">
              <button onClick={isEditing ? handleUpdate : handleSave} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
                {isEditing ? "Update" : "Save"}
              </button>
              <button onClick={handleEdit} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
                Edit
              </button>
              <button onClick={handleReset} className="px-4 py-1.5 text-sm cursor-pointer text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
                Reset
              </button>
            </div>}

        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {/* Loading skeleton for form fields */}
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="text-center text-gray-600 text-sm mt-4">
              Loading organization details...
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">Error loading organization details. Please try again.</p>
          </div>
        )}

        {/* Form Content - Only show when not loading */}
        {!isLoading && (
          <>
            {activeTab === "Items" && (
              <>
                <div>
                  <Products />
                </div>

              </>
            )}

            {activeTab === "organization" && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                  Organization Settings
                </h2>

                {/* Logo Upload */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={openLogoPreview}
                    disabled={!logoPreview}
                    className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden disabled:cursor-default"
                    title={logoPreview ? "Preview logo" : "No logo selected"}
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                      : <span className="text-xs text-gray-400">No logo</span>
                    }
                  </button>
                  <div className="flex flex-col gap-2">
                    <label className="block text-gray-700 font-medium text-sm">Organisation Logo</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex max-w-64 cursor-pointer items-center rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:border-blue-500 hover:text-blue-600">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="sr-only"
                        />
                        <span className="truncate">
                          {logoFile?.name || "Change Logo"}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={openLogoPreview}
                        disabled={!logoPreview}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    </div>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={handleLogoUpload}
                        className="self-start px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700"
                      >
                        Upload Logo
                      </button>
                    )}
                  </div>
                </div>
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
                    {inputErrors.organizationName && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {inputErrors.organizationName}
                      </p>
                    )}
                    {errors.organizationName && (
                      <p className="absolute text-xs text-red-600 mt-1">
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
                    {inputErrors.companyName && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {inputErrors.companyName}
                      </p>
                    )}
                    {errors.companyName && (
                      <p className="absolute text-xs text-red-600 mt-1">
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
                      value={settings.gstIN}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter GSTIN"
                    />
                    {inputErrors.gstIN && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {inputErrors.gstIN}
                      </p>
                    )}
                    {errors.gstIN && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {errors.gstIN}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      LUT Number
                    </label>
                    <input
                      type="text"
                      name="lut"
                      value={settings.lut || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., AD070124012345T"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      IEC Code
                    </label>
                    <input
                      type="text"
                      name="iec"
                      value={settings.iec || ""}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., AABCP1234C"
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
                      {selected ? ` ${selected.country}` : "Select country"}
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

                        value={settings.phone}
                        onChange={handlePhoneChange}
                        className={`border border-gray-300 
              ${(selected?.code && "rounded-tr-md rounded-br-md ") ||
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
                      value={settings.email}
                      onChange={handleChange}
                      className={`border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 ${emailDisable && "cursor-not-allowed bg-gray-50"}`}
                      placeholder="Enter organization email"
                      disabled={emailDisable}
                    />
                    {inputErrors.email && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {inputErrors.email}
                      </p>
                    )}
                    {errors.email && (
                      <p className="absolute text-xs text-red-600 mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Addresses Section */}

                  <div className="relative col-span-2">
                    <label className="block text-gray-700 font-medium mb-1">
                      Addresses *
                    </label>

                    {settings?.addresses?.map((addr, index) => (
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
                                  onChange={(e) =>
                                    handleAddressLabelChange(e, index)
                                  }
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
                          onChange={(e) => handleAddressChange(e, index)}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20"
                          placeholder={`Enter ${addr.label?.toLowerCase()}`}
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
                      value={settings.invoicePrefix}
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
                      value={settings.startingInvoiceNo}
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
                          IFSC Code
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

                      <div className="relative">
                        <label className="block text-gray-700 font-medium mb-1">
                          Account Type (Bank)
                        </label>
                        <select
                          name="accountType"
                          value={settings.accountType || ""}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select account type</option>
                          <option value="savings">Savings</option>
                          <option value="current">Current</option>
                          <option value="overdraft">Overdraft</option>
                        </select>
                      </div>

                      <div className="relative">
                        <label className="block text-gray-700 font-medium mb-1">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          name="bankBranch"
                          value={settings.bankBranch || ""}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g., Connaught Place, New Delhi"
                        />
                      </div>

                      <div className="relative">
                        <label className="block text-gray-700 font-medium mb-1">
                          SWIFT Code
                        </label>
                        <input
                          type="text"
                          name="swiftCode"
                          value={settings.swiftCode || ""}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g., HDFCINBB"
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
                      <option value="exclusive">
                        Tax Exclusive (Added on top)
                      </option>
                      <option value="inclusive">
                        Tax Inclusive (Included in price)
                      </option>
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

                {/* TDS Reference Accordion */}
                <TdsReferenceAccordion />

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
                                checked={
                                  settings.enabledMethods?.[method.key] || false
                                }
                                onChange={() => {
                                  const updated = { ...settings.enabledMethods };
                                  updated[method.key] = !updated[method.key];
                                  setSettings({
                                    ...settings,
                                    enabledMethods: updated,
                                  });
                                }}
                              />
                              <div
                                className={`block w-12 h-6 rounded-full transition ${settings.enabledMethods?.[method.key]
                                  ? "bg-blue-600"
                                  : "bg-gray-300"
                                  }`}
                              ></div>
                              <div
                                className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${settings.enabledMethods?.[method.key]
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
                              toast.info(
                                `QR image uploaded: ${e.target.files[0]?.name}`
                              )
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
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab === "users" && (
              <>
                {/* <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Users & Roles
            </h2> */}

                <div className="space-y-8">
                  {/* User List Section */}
                  {/* <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3">
                  Existing Users
                </h3>

                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">
                        Name
                      </th>
                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">
                        Email
                      </th>
                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">
                        Role
                      </th>
                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">
                        Status
                      </th>
                      <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm text-gray-800 border-b">
                        John Doe
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-800 border-b">
                        john@example.com
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-800 border-b">
                        Admin
                      </td>
                      <td className="py-2 px-4 text-sm text-green-600 font-semibold border-b">
                        Active
                      </td>
                      <td className="py-2 px-4 text-center border-b">
                        <button className="text-blue-600 hover:text-blue-800 text-sm mr-2">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          Remove
                        </button>
                      </td>
                    </tr>
                    
                  </tbody>
                </table>
              </div> */}

                  {/* Add New User Form */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                      Add User
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {/* Name */}
                      <div className="relative">
                        <label className="block text-gray-700 font-medium mb-1">
                          Full Name *
                        </label>
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
                        <label className="block text-gray-700 font-medium mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="newUserEmail"
                          value={settings.newUserEmail || ""}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter user's email address"
                        />
                      </div>

                      {/* Password */}
                      <div className="relative">
                        <label className="block text-gray-700 font-medium mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          name="newUserPassword"
                          value={settings.newUserPassword || ""}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter password"
                        />
                      </div>

                      {/* Role */}
                      {/* <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Role *
                    </label>
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
                  </div> */}

                      {/* Status */}
                      {/* <div className="relative">
                    <label className="block text-gray-700 font-medium mb-1">
                      Status
                    </label>
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
                  </div> */}
                    </div>

                    {/* <div className="mt-4">
                  <button
                    onClick={() =>
                      toast.success("New user added successfully!")
                    }
                    className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                  Add User
                  </button>
                </div> */}
                  </div>

                  {/* Roles & Permissions Section */}
                  {/* <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">
                  Roles & Permissions
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 border-b">
                          Role
                        </th>
                        <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">
                          View
                        </th>
                        <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">
                          Edit
                        </th>
                        <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">
                          Delete
                        </th>
                        <th className="py-2 px-4 text-center text-sm font-semibold text-gray-700 border-b">
                          Export
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        "Admin",
                        "Manager",
                        "Accountant",
                        "Viewer",
                        "Custom",
                      ].map((role) => (
                        <tr key={role} className="hover:bg-gray-50">
                          <td className="py-2 px-4 text-sm text-gray-800 border-b">
                            {role}
                          </td>
                          {["view", "edit", "delete", "export"].map((perm) => (
                            <td
                              key={perm}
                              className="py-2 px-4 text-center border-b"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  settings.permissions?.[role]?.[perm] ||
                                  role === "Admin"
                                }
                                disabled={role === "Admin"}
                                onChange={() => {
                                  const updated = { ...settings.permissions };
                                  updated[role] = {
                                    ...updated[role],
                                    [perm]: !updated[role]?.[perm],
                                  };
                                  setSettings({
                                    ...settings,
                                    permissions: updated,
                                  });
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div> */}
                </div>
              </>
            )}
            {activeTab === "services" && (
              <ServicesTab
                services={settings.services}
                onChange={(updated) => setSettings((p) => ({ ...p, services: updated }))}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
