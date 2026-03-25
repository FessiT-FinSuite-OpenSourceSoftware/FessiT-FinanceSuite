import React, { useState, useEffect, useRef } from "react";
import { Mail, Phone, X, FolderOpen } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { countriesData } from "../../utils/countriesData";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { customerSelector, fetchOneCustomer, updateCustomerData } from "../../ReduxApi/customer";
import { toast } from "react-toastify";

const emptyProject = { projectName: "", projectOwner: "", description: "" };

function ProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({ ...emptyProject });
  const handleSave = () => {
    if (!form.projectName.trim() || !form.projectOwner.trim()) {
      toast.error("Project name and owner are required");
      return;
    }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">Add Project</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-gray-800" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project name" value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Owner *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project owner" value={form.projectOwner} onChange={e => setForm(p => ({ ...p, projectOwner: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-gray-400">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700">Add</button>
        </div>
      </div>
    </div>
  );
}


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
  const [customer, setCustomer] = useState({ customerName: "", companyName: "", gstIN: "", addresses: [{ label: "Primary Address", value: "" }], country: "", countryCode: "", phone: "", email: "", isActive: "", projects: [] });
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { currentCustomer } = useSelector(customerSelector);

  useEffect(() => { dispatch(fetchOneCustomer(id)); }, [dispatch, id]);

  useEffect(() => {
    if (currentCustomer) {
      setCustomer({
        customerName: currentCustomer.customerName || "",
        companyName: currentCustomer.companyName || "",
        gstIN: currentCustomer.gstIN || "",
        isActive: currentCustomer.isActive || "",
        phone: currentCustomer.phone || "",
        email: currentCustomer.email || "",
        country: currentCustomer.country || "",
        countryCode: currentCustomer.countryCode || "",
        addresses: currentCustomer.addresses?.length ? currentCustomer.addresses : [{ label: "Primary Address", value: "" }],
        projects: currentCustomer.projects || [],
      });
      const foundCountry = countriesData.countries.find(c => c.country === currentCustomer.country || c.code === currentCustomer.countryCode);
      if (foundCountry) setSelected(foundCountry);
    }
  }, [id, currentCustomer]);

  const handleAddProject = (form) => {
    const updatedProjects = [...customer.projects, form];
    const updated = { ...customer, projects: updatedProjects };
    setCustomer(updated);
    dispatch(updateCustomerData(id, updated));
    setShowProjectModal(false);
  };

  return (
    <div className="relative">
      {/* Action Bar */}
      <div className="sticky top-[88px] w-full z-100 rounded-lg bg-white border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2">
            <ArrowLeft strokeWidth={1} className="cursor-pointer" onClick={() => nav("/customers")} />
          </div>
          <div className="flex gap-2 mr-5">
            <button onClick={() => nav(`/customers/editCustomer/${id}`)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Edit</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-6 py-3 text-lg font-medium transition-colors ${
              activeTab === "details" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Customer Details
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-3 text-lg font-medium transition-colors ${
              activeTab === "projects" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Projects ({customer.projects.length > 0 && <span className="">{customer.projects.length}</span>})
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 capitalize">{customer.customerName || "N/A"}</h1>
              <p className="text-xl text-gray-600 mt-1">{customer.companyName || "N/A"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs uppercase text-blue-600 font-semibold mb-1">GSTIN</p>
                <p className="text-lg font-bold text-gray-900">{customer.gstIN || "N/A"}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs uppercase text-green-600 font-semibold mb-1">Country</p>
                <p className="text-lg font-bold text-gray-900">{selected?.country || "N/A"}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs uppercase text-purple-600 font-semibold mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  customer.isActive === "Active" ? "bg-green-100 text-green-800" :
                  customer.isActive === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                }`}>{customer.isActive || "N/A"}</span>
              </div>
            </div>
            <div className="border-t pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail strokeWidth={1} className="w-5 h-5 text-black mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-base font-medium text-gray-900">{customer.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone strokeWidth={1} className="w-5 h-5 text-black mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="text-base font-medium text-gray-900">{selected?.code} {customer.phone || "N/A"}</p>
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
                    <p className="text-gray-700">{addr.value || "No address provided"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Projects</h2>
              <button onClick={() => setShowProjectModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Project</button>
            </div>
            {customer.projects.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No projects yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customer.projects.map((proj, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{proj.projectName}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{index + 1}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Owner</p>
                    <p className="text-sm font-medium text-gray-700 mb-3">{proj.projectOwner}</p>
                    {proj.description && (
                      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showProjectModal && (
        <ProjectModal onSave={handleAddProject} onClose={() => setShowProjectModal(false)} />
      )}
    </div>
  );
}
