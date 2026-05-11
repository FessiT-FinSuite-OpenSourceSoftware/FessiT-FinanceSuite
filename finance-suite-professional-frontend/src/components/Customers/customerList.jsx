import React, { useState, useEffect } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchCustomerData, customerSelector, deleteCustomer, updateCustomerData } from "../../ReduxApi/customer";
import { authSelector } from "../../ReduxApi/auth";
import { canWrite, canDelete, Module } from "../../utils/permissions";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import {
  TabActionBar, FilterSelect, StatCard, DataTable, RowActions,
  Pagination, ConfirmModal, Modal, FormField, inputCls,
} from "../../shared/ui";

function ProjectModal({ customerName, onSave, onClose }) {
  const [form, setForm] = useState({ projectName: "", projectOwner: "", description: "" });
  const handleSave = () => {
    if (!form.projectName.trim() || !form.projectOwner.trim()) { toast.error("Project name and owner are required"); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base font-semibold text-gray-800">Add Project</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-gray-800" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">for <span className="font-medium capitalize">{customerName}</span></p>
        <div className="space-y-3">
          {[{ label: "Project Name *", key: "projectName" }, { label: "Project Owner *", key: "projectOwner" }, { label: "Description", key: "description" }].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input className={inputCls} placeholder={`Enter ${label.replace(" *", "").toLowerCase()}`} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-gray-400">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700">Add</button>
        </div>
      </div>
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case "Active":   return "bg-green-100 text-green-800";
    case "Prospect": return "bg-blue-100 text-blue-800";
    case "Closed":   return "bg-gray-100 text-gray-800";
    default:         return "bg-red-100 text-red-800";
  }
};

export default function CustomerList() {
  const { customersData } = useSelector(customerSelector);
  const { user } = useSelector(authSelector);
  const hasWrite = canWrite(user, Module.Customers);
  const hasDelete = canDelete(user, Module.Customers);
  const dispatch = useDispatch();
  const nav = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projectModal, setProjectModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => { dispatch(fetchCustomerData()); }, [dispatch]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, roleFilter]);

  const filtered = customersData.filter((item) => {
    const matchesSearch =
      item.gstIN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.isActive === statusFilter;
    const matchesRole = roleFilter === "All" ||
      (roleFilter === "Customer" && (item.role === "Customer" || item.role === "Both" || (!item.role && !item.is_vendor_too))) ||
      (roleFilter === "Vendor" && (item.role === "Vendor" || item.role === "Both" || (!item.role && item.is_vendor_too))) ||
      (roleFilter === "Both" && item.role === "Both");
    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAddProject = (form) => {
    const target = customersData.find(c => c._id?.$oid === projectModal.id);
    if (!target) return;
    dispatch(updateCustomerData(projectModal.id, { ...target, projects: [...(target.projects || []), form] }));
    setProjectModal(null);
  };

  const handleStatusUpdate = async () => {
    if (!statusModal) return;
    const full = customersData.find((c) => c._id?.$oid === statusModal.id);
    if (!full) return;
    await dispatch(updateCustomerData(statusModal.id, { ...full, isActive: selectedStatus }));
    setStatusModal(null);
  };

  const columns = [
    {
      label: "Customer",
      render: (item) => (
        <span className="block truncate max-w-[160px] text-blue-600 font-medium cursor-pointer capitalize" title={item?.customerName} onClick={() => nav(`/customers/customer/${item?._id?.$oid}`)}>
          {item?.customerName}
        </span>
      ),
    },
    {
      label: "Company",
      render: (item) => (
        <span className="block truncate max-w-[160px] text-gray-700 capitalize" title={item?.companyName}>{item?.companyName}</span>
      ),
    },
    {
      label: "GSTIN",
      hidden: true,
      render: (item) => <span className="text-gray-500">{item?.gstIN || "—"}</span>,
    },
    {
      label: "Business Type",
      render: (item) => (
        <span className={`inline-flex items-center justify-center w-20 px-2 py-0.5 text-xs font-semibold rounded-full ${
          (item?.role === "Customer" || (!item?.role && !item?.is_vendor_too)) ? "bg-blue-100 text-blue-700" :
          item?.role === "Vendor" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
        }`}>
          {item?.role || (item?.is_vendor_too ? "Both" : "Customer")}
        </span>
      ),
    },
    {
      label: "Status",
      render: (item) => (
        <span
          onClick={() => {
            if (!hasWrite) return;
            setSelectedStatus(item?.isActive || "New");
            setStatusModal({ id: item?._id?.$oid, customerName: item?.customerName });
          }}
          className={`inline-flex items-center justify-center w-20 px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusColor(item?.isActive)} ${hasWrite ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
        >
          {item?.isActive || "New"}
        </span>
      ),
    },
    {
      label: "Projects",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          {item?.projects?.length > 0 ? item.projects.length : "—"}
          <button onClick={(e) => { e.stopPropagation(); setProjectModal({ id: item?._id?.$oid, customerName: item?.customerName }); }} className="text-gray-400 hover:text-blue-600 ml-1" title="Add Project">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      label: "Actions",
      right: true,
      stopPropagation: true,
      render: (item) => (
        <RowActions
          onEdit={() => hasWrite && nav(`/customers/editCustomer/${item?._id?.$oid}`)}
          onDelete={() => hasDelete && setDeleteModal({ id: item?._id?.$oid, name: item?.customerName })}
          canEdit={hasWrite} canDelete={hasDelete}
        />
      ),
    },
  ];

  return (
    <div className="max-w-7xl lg:w-full md:w-full">
      <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by customer, or company...">
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <option value="All">All Status</option>
          <option value="New">New</option>
          <option value="Prospect">Prospect</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </FilterSelect>
        <FilterSelect value={roleFilter} onChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
          <option value="All">All Roles</option>
          <option value="Customer">Customer</option>
          <option value="Vendor">Vendor</option>
          <option value="Both">Both</option>
        </FilterSelect>
        <button onClick={() => nav("/customers/addCustomer")} disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${hasWrite ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total"     value={customersData.length} />
        <StatCard label="Customers" value={customersData.filter((i) => i.role === "Customer" || (!i.role && !i.is_vendor_too)).length} valueClass="text-blue-600" />
        <StatCard label="Vendors"   value={customersData.filter((i) => i.role === "Vendor").length} valueClass="text-purple-600" />
        <StatCard label="Both"      value={customersData.filter((i) => i.role === "Both" || (!i.role && i.is_vendor_too)).length} valueClass="text-green-600" />
        <StatCard label="Active"    value={customersData.filter((i) => i.isActive === "Active").length} valueClass="text-green-600" />
      </div>

      <DataTable
        data={current}
        rowKey={(item) => item?._id?.$oid}
        columns={columns}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {projectModal && <ProjectModal customerName={projectModal.customerName} onSave={handleAddProject} onClose={() => setProjectModal(null)} />}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete <span className="font-medium capitalize">{deleteModal.name}</span>?</>}
          onConfirm={() => { dispatch(deleteCustomer(deleteModal.id)); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {statusModal && (
        <Modal title="Update Customer Status" onClose={() => setStatusModal(null)} onSave={handleStatusUpdate} saveLabel="Update">
          <FormField label={`Status for ${statusModal.customerName}`} colSpan>
            <div className="flex flex-wrap gap-4">
              {["New", "Prospect", "Active", "Closed"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="status" value={opt} checked={selectedStatus === opt} onChange={() => setSelectedStatus(opt)} className="w-4 h-4 accent-blue-600" />
                  <span className="font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </FormField>
        </Modal>
      )}
    </div>
  );
}
