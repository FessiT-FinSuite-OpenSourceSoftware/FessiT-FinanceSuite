import React, { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { fetchAllProjects, addProject, updateProject, deleteProject, projectSelector } from '../../ReduxApi/project'
import { fetchCustomerData, customerSelector } from '../../ReduxApi/customer'
import { authSelector } from '../../ReduxApi/auth'
import { canWrite, canDelete, Module } from '../../utils/permissions'
import { TabActionBar, FilterSelect, StatCard, DataTable, RowActions, Pagination, ConfirmModal } from '../../shared/ui'

const emptyForm = { projectName: '', projectOwner: '', owner_email: '', description: '' }

function ProjectModal({ project, customers, existingProjects, onSave, onClose }) {
  const [form, setForm] = useState(project ? { ...project } : { ...emptyForm, customerId: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.projectName.trim()) e.projectName = 'Project name is required'
    if (!form.projectOwner.trim()) e.projectOwner = 'Project owner is required'
    if (!project && !form.customerId) e.customerId = 'Customer is required'
    if (form.owner_email && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.owner_email)) e.owner_email = 'Invalid email'
    const targetCustomerId = project ? project.customerId : form.customerId
    const isDuplicate = existingProjects
      .filter(p => p.customerId === targetCustomerId && (!project || p.projectIndex !== project.projectIndex))
      .some(p => p.projectName.trim().toLowerCase() === form.projectName.trim().toLowerCase())
    if (isDuplicate) e.projectName = 'A project with this name already exists for this customer'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">{project ? 'Edit Project' : 'Add Project'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-gray-800" /></button>
        </div>
        <div className="space-y-3">
          {!project && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm" value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c._id?.$oid || c._id} value={c._id?.$oid || c._id}>{c.customerName} — {c.companyName}</option>)}
              </select>
              {errors.customerId && <p className="text-xs text-red-600 mt-1">{errors.customerId}</p>}
            </div>
          )}
          {[{ label: 'Project Name *', key: 'projectName' }, { label: 'Project Owner *', key: 'projectOwner' }, { label: 'Email', key: 'owner_email', type: 'email' }, { label: 'Description', key: 'description' }].map(({ label, key, type = 'text' }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type={type} className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm" placeholder={`Enter ${label.replace(' *', '').toLowerCase()}`} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-gray-400">Cancel</button>
          <button onClick={() => { if (validate()) onSave(form) }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700">{project ? 'Update' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectList() {
  const dispatch = useDispatch()
  const { projectsData, isLoading } = useSelector(projectSelector)
  const { customersData } = useSelector(customerSelector)
  const { user } = useSelector(authSelector)
  const hasWrite = canWrite(user, Module.Customers)
  const hasDelete = canDelete(user, Module.Customers)

  const [searchTerm, setSearchTerm] = useState('')
  const [customerFilter, setCustomerFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modal, setModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)

  useEffect(() => { dispatch(fetchAllProjects()); dispatch(fetchCustomerData()) }, [dispatch])
  useEffect(() => { setCurrentPage(1) }, [searchTerm, customerFilter])

  const q = searchTerm.toLowerCase()
  const filtered = projectsData.filter(p => {
    const matchesSearch = p.projectName?.toLowerCase().includes(q) || p.projectOwner?.toLowerCase().includes(q) || p.owner_email?.toLowerCase().includes(q) || p.customerName?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    return matchesSearch && (customerFilter === 'All' || p.customerName === customerFilter)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const uniqueCustomers = [...new Set(projectsData.map(p => p.customerName).filter(Boolean))]

  const handleSave = async (form) => {
    try {
      if (modal.mode === 'add') {
        const { customerId, ...projectData } = form
        await dispatch(addProject(customerId, projectData))
      } else {
        await dispatch(updateProject(modal.customerId, modal.index, { projectName: form.projectName, projectOwner: form.projectOwner, owner_email: form.owner_email, description: form.description }))
      }
      setModal(null)
    } catch (_) {}
  }

  const columns = [
    { label: 'Sl No',       render: (proj, i) => <span className="font-medium text-gray-900">{(currentPage - 1) * pageSize + current.indexOf(proj) + 1}</span> },
    { label: 'Project Name', render: (proj) => <span className="font-medium text-gray-900">{proj.projectName}</span> },
    { label: 'Customer',     render: (proj) => <span className="text-gray-600 capitalize">{proj.customerName}</span> },
    { label: 'Owner',        hidden: true, render: (proj) => <span className="text-gray-600">{proj.projectOwner}</span> },
    { label: 'Owner Email',  hidden: true, render: (proj) => <span className="text-gray-500">{proj.owner_email || '—'}</span> },
    {
      label: 'Actions',
      right: true,
      stopPropagation: true,
      render: (proj) => (
        <RowActions
          onEdit={(e) => { e?.stopPropagation?.(); hasWrite && setModal({ mode: 'edit', customerId: proj.customerId, index: proj.projectIndex, project: proj }) }}
          onDelete={(e) => { e?.stopPropagation?.(); hasDelete && setDeleteModal({ proj }) }}
          canEdit={hasWrite} canDelete={hasDelete}
        />
      ),
    },
  ]

  return (
    <div className="w-full lg:w-full md:w-full">
      <TabActionBar searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} searchPlaceholder="Search by name, owner, email, customer...">
        <FilterSelect value={customerFilter} onChange={(v) => { setCustomerFilter(v); setCurrentPage(1); }}>
          <option value="All">All Customers</option>
          {uniqueCustomers.map(name => <option key={name} value={name}>{name}</option>)}
        </FilterSelect>
        <button onClick={() => setModal({ mode: 'add' })} disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${hasWrite ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Projects" value={projectsData.length} />
        <StatCard label="Customers with Projects" value={uniqueCustomers.length} valueClass="text-blue-600" />
        <StatCard label="With Email" value={projectsData.filter(p => p.owner_email).length} valueClass="text-green-600" />
      </div>

      <DataTable
        isLoading={isLoading}
        data={current}
        rowKey={(proj, i) => `${proj.customerId}-${proj.projectIndex}`}
        columns={columns}
        renderExpanded={(proj) => (
          <div className="p-4 rounded-2xl bg-[#ECEEF2]">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
            <p className="text-sm text-gray-700">{proj.description || 'No description provided.'}</p>
          </div>
        )}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {modal && <ProjectModal project={modal.mode === 'edit' ? modal.project : null} customers={customersData} existingProjects={projectsData} onSave={handleSave} onClose={() => setModal(null)} />}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete <span className="font-bold capitalize">{deleteModal.proj.projectName}</span>?</>}
          onConfirm={async () => { await dispatch(deleteProject(deleteModal.proj.customerId, deleteModal.proj.projectIndex)); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
