import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, User, X, ChevronDown } from "lucide-react";
import { createEmployee, updateEmployee, fetchAllEmployees } from "../../ReduxApi/employee";
import axiosInstance from "../../utils/axiosInstance";
import PhotoCropper from "./PhotoCropper";
import { countriesData } from "../../utils/countriesData";

const COUNTRIES = countriesData.countries.map((c) => ({
  code: c.iso,
  dial: c.code,
  flag: typeof c.flag === 'string' ? c.flag : `https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`,
  name: c.country,
}));

const INDIA = COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0];

function PhoneField({ label, name, value, onChange, error, required }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(INDIA);
  const wrapRef = useRef(null);
  const dropRef = useRef(null);

  // On mount / value change from outside (edit mode), sync country from stored value
  useEffect(() => {
    if (!value) return;
    const match = COUNTRIES.find((c) => value.startsWith(c.dial + ' ') || value === c.dial);
    if (match) setSelectedCountry(match);
  }, []); // only on mount so user selection isn't overridden

  // Extract just the number part (without dial code)
  const numberPart = (() => {
    const prefix = selectedCountry.dial + ' ';
    if (value && value.startsWith(prefix)) return value.slice(prefix.length);
    if (value && value.startsWith(selectedCountry.dial)) return value.slice(selectedCountry.dial.length).trimStart();
    return value || '';
  })();

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) &&
          dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  );

  const handleCountrySelect = (c) => {
    setSelectedCountry(c);
    onChange({ target: { name, value: numberPart ? `${c.dial} ${numberPart}` : c.dial } });
    setOpen(false); setSearch('');
  };

  const handleNumberChange = (e) => {
    const num = e.target.value;
    onChange({ target: { name, value: num ? `${selectedCountry.dial} ${num}` : '' } });
  };

  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <div className={`flex rounded-md border text-sm focus-within:ring-2 focus-within:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}>
        <button type="button" onClick={() => { setOpen((p) => !p); setSearch(''); }}
          className="flex items-center gap-1 px-2 py-2 bg-gray-50 border-r border-gray-300 hover:bg-gray-100 shrink-0 rounded-l-md">
          <img src={selectedCountry.flag} alt={selectedCountry.name} className="w-5 h-3.5 object-cover rounded-sm" />
          <span className="text-xs text-gray-600 font-medium">{selectedCountry.dial}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        <input
          type="tel"
          placeholder="Enter number"
          value={numberPart}
          onChange={handleNumberChange}
          className="flex-1 px-3 py-2 outline-none bg-white text-sm rounded-r-md"
        />
      </div>
      {open && (
        <div ref={dropRef} className="relative z-50">
          <div className="absolute top-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input autoFocus type="text" placeholder="Search country..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.map((c) => (
                <div key={c.code + c.dial}
                  onMouseDown={(e) => { e.preventDefault(); handleCountrySelect(c); }}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                    c.code === selectedCountry.code ? 'bg-blue-50 font-medium' : ''
                  }`}>
                  <img src={c.flag} alt={c.name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                  <span className="flex-1 text-gray-700">{c.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{c.dial}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

const EMPTY = {
  first_name: "", last_name: "", emp_id: "", department: "",
  employee_type: "permanent", status: "full-time",
  join_date: "", exit_date: "", reporting_manager_id: "",
  email: "", personal_email: "", primary_contact: "", emergency_contact: "",
  pan_number: "", uan_number: "", passport_number: "",
  passport_issued_date: "", passport_expiry_date: "",
  communication_address: "", permanent_address: "",
};

const steps = [
  { id: 1, title: "Basic Info", description: "Identity, role & dates" },
  { id: 2, title: "Contact & Documents", description: "Email, contact & IDs" },
  { id: 3, title: "Review & Submit", description: "Confirm and save" },
];

const EMP_TYPES = ["permanent", "contract", "intern"];
const EMP_STATUSES = ["full-time", "probation", "relieved"];
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const Field = ({ label, name, value, onChange, error, type = "text", placeholder = "", required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
    <input
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-400" : "border-gray-300"}`}
    />
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select name={name} value={value} onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ReviewRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-48 shrink-0">{label}</span>
    <span className="text-sm text-gray-800">{value || <span className="italic text-gray-400">—</span>}</span>
  </div>
);

function ManagerSelect({ value, onChange, managers, excludeId }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = managers
    .filter((m) => m.id !== excludeId)
    .filter((m) =>
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.emp_id?.toLowerCase().includes(search.toLowerCase()) ||
      m.department?.toLowerCase().includes(search.toLowerCase())
    );

  const selected = managers.find((m) => m.id === value);
  const displayText = selected ? `${selected.name} (${selected.emp_id})` : "";

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
          placeholder="Search by name, ID or department..."
          value={open ? search : displayText}
          onFocus={() => { setOpen(true); setSearch(""); }}
          onBlur={() => setTimeout(() => { setOpen(false); setSearch(""); }, 150)}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-xl mt-1 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
            {selected && <span className="text-xs text-blue-600 font-medium">{selected.name} selected</span>}
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div
              onMouseDown={() => { onChange(""); setOpen(false); setSearch(""); }}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 text-gray-400 italic ${!value ? "bg-blue-50" : ""}`}
            >
              — None —
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No employees found</div>
            ) : filtered.map((m) => (
              <div
                key={m.id}
                onMouseDown={() => { onChange(m.id); setOpen(false); setSearch(""); }}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0 ${
                  m.id === value ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-800">{m.name}</span>
                  <span className="text-xs text-gray-400 font-mono shrink-0">{m.emp_id}</span>
                </div>
                {m.department && <p className="text-xs text-gray-400 mt-0.5">{m.department}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddEmployee() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhoto, setExistingPhoto] = useState("");
  const [allManagers, setAllManagers] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAllEmployees()).then((list) => setAllManagers(Array.isArray(list) ? list : []));
  }, [dispatch]);

  // Pre-fill form when editing
  useEffect(() => {
    if (!isEdit) return;
    axiosInstance.get(`/employees/${id}`).then(({ data: e }) => {
      const managerId =
        e.reportingManagerId?.$oid ||
        e.reportingManagerId ||
        e.reporting_manager_id?.$oid ||
        e.reporting_manager_id || "";
      setForm({
        first_name: e.first_name || "", last_name: e.last_name || "",
        emp_id: e.emp_id || "", department: e.department || "",
        employee_type: e.employee_type || "permanent",
        status: e.status || "full-time",
        join_date: e.join_date || "", exit_date: e.exit_date || "",
        reporting_manager_id: managerId,
        email: e.email || "", personal_email: e.personal_email || "",
        primary_contact: e.primary_contact || "", emergency_contact: e.emergency_contact || "",
        pan_number: e.pan_number || "", uan_number: e.uan_number || "",
        passport_number: e.passport_number || "",
        passport_issued_date: e.passport_issued_date || "",
        passport_expiry_date: e.passport_expiry_date || "",
        communication_address: e.communication_address || "",
        permanent_address: e.permanent_address || "",
      });
      if (e.photo) {
        setExistingPhoto(e.photo);
        axiosInstance.get(`/employee-photos/${e.photo}`, { responseType: "blob" })
          .then((res) => setPhotoPreview(URL.createObjectURL(res.data)))
          .catch(() => { });
      }
    }).catch(() => { });
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropDone = (file, preview) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setCropSrc(null);
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!form.first_name.trim()) errs.first_name = "First name is required";
      if (!form.emp_id.trim()) errs.emp_id = "Employee ID is required";
    }
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep((s) => s + 1); };
  const prevStep = () => setCurrentStep((s) => s - 1);

  const handleSubmit = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.emp_id.trim()) errs.emp_id = "Employee ID is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsLoading(true);
    if (isEdit) {
      await dispatch(updateEmployee(id, form, photoFile, { page: 1, pageSize: 10 }));
    } else {
      await dispatch(createEmployee(form, photoFile, { page: 1, pageSize: 10 }));
    }
    setIsLoading(false);
    nav("/employees");
  };

  const selectedManager = allManagers.find((m) => m.id === form.reporting_manager_id);

  const photoSection = (
    <div className="flex items-center gap-4 mb-6">
      <button type="button" onClick={() => photoPreview && setPreviewOpen(true)}
        className={`h-16 w-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 ${photoPreview ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
        {photoPreview ? <img src={photoPreview} alt="preview" className="h-full w-full object-cover" /> : <User className="w-7 h-7 text-gray-300" />}
      </button>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee Photo</label>
        <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        <p className="text-xs text-gray-400 mt-1">Click avatar to preview • JPG, PNG accepted</p>
      </div>
    </div>
  );

  const renderEditForm = () => (
    <div className="space-y-6">
      {photoSection}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Basic Info</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required placeholder="First name" />
          <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" />
          <Field label="Employee ID" name="emp_id" value={form.emp_id} onChange={handleChange} error={errors.emp_id} required placeholder="EMP-001" />
          <Field label="Department" name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
          <SelectField label="Employee Type" name="employee_type" value={form.employee_type} onChange={handleChange} options={EMP_TYPES.map((t) => ({ value: t, label: cap(t) }))} />
          <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={EMP_STATUSES.map((s) => ({ value: s, label: cap(s) }))} />
          <Field label="Join Date" name="join_date" value={form.join_date} onChange={handleChange} type="date" />
          <Field label="Exit Date" name="exit_date" value={form.exit_date} onChange={handleChange} type="date" />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
            <ManagerSelect
              value={form.reporting_manager_id}
              onChange={(val) => { setForm((p) => ({ ...p, reporting_manager_id: val })); }}
              managers={allManagers}
              excludeId={id}
            />
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Contact & Documents</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Work Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="work@company.com" />
          <Field label="Personal Email" name="personal_email" value={form.personal_email} onChange={handleChange} type="email" placeholder="personal@email.com" />
          <PhoneField label="Primary Contact" name="primary_contact" value={form.primary_contact} onChange={handleChange} />
          <PhoneField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} />
          <Field label="PAN Number" name="pan_number" value={form.pan_number} onChange={handleChange} placeholder="ABCDE1234F" />
          <Field label="UAN Number" name="uan_number" value={form.uan_number} onChange={handleChange} placeholder="UAN number" />
          <Field label="Passport Number" name="passport_number" value={form.passport_number} onChange={handleChange} placeholder="Passport number" />
          <div />
          <Field label="Passport Issued Date" name="passport_issued_date" value={form.passport_issued_date} onChange={handleChange} type="date" />
          <Field label="Passport Expiry Date" name="passport_expiry_date" value={form.passport_expiry_date} onChange={handleChange} type="date" />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Communication Address</label>
            <textarea name="communication_address" value={form.communication_address} onChange={handleChange} rows={2}
              placeholder="Current / communication address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
            <textarea name="permanent_address" value={form.permanent_address} onChange={handleChange} rows={2}
              placeholder="Permanent address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {photoSection}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required placeholder="First name" />
              <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" />
              <Field label="Employee ID" name="emp_id" value={form.emp_id} onChange={handleChange} error={errors.emp_id} required placeholder="EMP-001" />
              <Field label="Department" name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
              <SelectField label="Employee Type" name="employee_type" value={form.employee_type} onChange={handleChange}
                options={EMP_TYPES.map((t) => ({ value: t, label: cap(t) }))} />
              <SelectField label="Status" name="status" value={form.status} onChange={handleChange}
                options={EMP_STATUSES.map((s) => ({ value: s, label: cap(s) }))} />
              <Field label="Join Date" name="join_date" value={form.join_date} onChange={handleChange} type="date" />
              <Field label="Exit Date" name="exit_date" value={form.exit_date} onChange={handleChange} type="date" />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                <ManagerSelect
                  value={form.reporting_manager_id}
                  onChange={(val) => { setForm((p) => ({ ...p, reporting_manager_id: val })); }}
                  managers={allManagers}
                  excludeId={id}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Work Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="work@company.com" />
            <Field label="Personal Email" name="personal_email" value={form.personal_email} onChange={handleChange} type="email" placeholder="personal@email.com" />
            <PhoneField label="Primary Contact" name="primary_contact" value={form.primary_contact} onChange={handleChange} />
            <PhoneField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} />
            <Field label="PAN Number" name="pan_number" value={form.pan_number} onChange={handleChange} placeholder="ABCDE1234F" />
            <Field label="UAN Number" name="uan_number" value={form.uan_number} onChange={handleChange} placeholder="UAN number" />
            <Field label="Passport Number" name="passport_number" value={form.passport_number} onChange={handleChange} placeholder="Passport number" />
            <div />
            <Field label="Passport Issued Date" name="passport_issued_date" value={form.passport_issued_date} onChange={handleChange} type="date" />
            <Field label="Passport Expiry Date" name="passport_expiry_date" value={form.passport_expiry_date} onChange={handleChange} type="date" />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication Address</label>
              <textarea name="communication_address" value={form.communication_address} onChange={handleChange} rows={2}
                placeholder="Current / communication address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
              <textarea name="permanent_address" value={form.permanent_address} onChange={handleChange} rows={2}
                placeholder="Permanent address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Basic Info</p>
              {photoPreview && (
                <button type="button" onClick={() => setPreviewOpen(true)} className="mb-3 cursor-pointer hover:opacity-80">
                  <img src={photoPreview} alt="Employee" className="h-14 w-14 rounded-full object-cover border border-gray-200" />
                </button>
              )}
              <ReviewRow label="First Name" value={form.first_name} />
              <ReviewRow label="Last Name" value={form.last_name} />
              <ReviewRow label="Employee ID" value={form.emp_id} />
              <ReviewRow label="Department" value={form.department} />
              <ReviewRow label="Type" value={cap(form.employee_type)} />
              <ReviewRow label="Status" value={cap(form.status)} />
              <ReviewRow label="Join Date" value={form.join_date} />
              <ReviewRow label="Exit Date" value={form.exit_date} />
              <ReviewRow label="Manager" value={selectedManager ? `${selectedManager.name} (${selectedManager.emp_id})` : ""} />
            </div>
            <div className="mt-6 md:mt-0">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Contact & Documents</p>
              <ReviewRow label="Work Email" value={form.email} />
              <ReviewRow label="Personal Email" value={form.personal_email} />
              <ReviewRow label="Primary Contact" value={form.primary_contact} />
              <ReviewRow label="Emergency Contact" value={form.emergency_contact} />
              <ReviewRow label="PAN Number" value={form.pan_number} />
              <ReviewRow label="UAN Number" value={form.uan_number} />
              <ReviewRow label="Passport Number" value={form.passport_number} />
              <ReviewRow label="Passport Issued" value={form.passport_issued_date} />
              <ReviewRow label="Passport Expiry" value={form.passport_expiry_date} />
              <ReviewRow label="Communication Addr." value={form.communication_address} />
              <ReviewRow label="Permanent Addr." value={form.permanent_address} />
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col mt-2.5 mx-3">
      {cropSrc && <PhotoCropper imageSrc={cropSrc} onDone={handleCropDone} onCancel={() => setCropSrc(null)} />}
      {previewOpen && photoPreview && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80" onClick={() => setPreviewOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
          <img src={photoPreview} alt="Employee" className="max-h-[80vh] max-w-[80vw] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}

      <button onClick={() => nav("/employees")} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Employees
      </button>

      <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 lg:px-6">
        {isEdit ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Employee</h3>
            {renderEditForm()}
            <div className="flex justify-end mt-8">
              <button onClick={handleSubmit} disabled={isLoading}
                className={`px-6 py-2 rounded-md text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isLoading ? "Saving..." : "Update Employee"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-nowrap items-center justify-center mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-none items-center">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium ${
                    currentStep > step.id ? "bg-green-500 border-green-500 text-white" :
                    currentStep === step.id ? "bg-blue-500 border-blue-500 text-white" :
                    "bg-white border-gray-300 text-gray-500"}`}>
                    {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="ml-2 text-left whitespace-nowrap">
                    <p className={`text-sm font-medium ${currentStep >= step.id ? "text-gray-900" : "text-gray-500"}`}>{step.title}</p>
                    <p className="hidden lg:block text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 lg:w-12 h-0.5 mx-2 lg:mx-3 flex-none ${currentStep > step.id ? "bg-green-500" : "bg-gray-300"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{steps[currentStep - 1].title}</h3>
              {renderStep()}
              <div className="flex justify-between gap-3 mt-8">
                <button onClick={prevStep} disabled={currentStep === 1}
                  className={`flex items-center px-4 py-2 rounded-md ${currentStep === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </button>
                {currentStep < steps.length ? (
                  <button onClick={nextStep} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={isLoading}
                    className={`px-6 py-2 rounded-md text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                    {isLoading ? "Saving..." : "Create Employee"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
