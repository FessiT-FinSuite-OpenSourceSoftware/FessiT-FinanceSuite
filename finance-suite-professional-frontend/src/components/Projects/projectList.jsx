import React, { useEffect, useState } from 'react'
import { Search, Plus, Edit2, Trash2, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { fetchAllProjects, addProject, updateProject, deleteProject, projectSelector } from '../../ReduxApi/project'
import { fetchCustomerData, customerSelector } from '../../ReduxApi/customer'
import { authSelector } from '../../ReduxApi/auth'
import { canWrite, canDelete, Module } from '../../utils/permissions'

const emptyForm = { projectName: '', projectOwner: '', owner_email: '', description: '' }

function ProjectModal({ project, customers, existingProjects, onSave, onClose }) {
  const [form, setForm] = useState(project ? { ...project } : { ...emptyForm, customerId: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.projectName.trim()) e.projectName = 'Project name is required'
    if (!form.projectOwner.trim()) e.projectOwner = 'Project owner is required'
    if (!project && !form.customerId) e.customerId = 'Customer is required'
    if (form.owner_email && !/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.owner_email))
      e.owner_email = 'Invalid email'
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
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500"
                value={form.customerId}
                onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c._id?.$oid || c._id} value={c._id?.$oid || c._id}>
                    {c.customerName} — {c.companyName}
                  </option>
                ))}
              </select>
              {errors.customerId && <p className="text-xs text-red-600 mt-1">{errors.customerId}</p>}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project name" value={form.projectName} onChange={e => setForm(p => ({ ...p, projectName: e.target.value }))} />
            {errors.projectName && <p className="text-xs text-red-600 mt-1">{errors.projectName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Owner *</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter project owner" value={form.projectOwner} onChange={e => setForm(p => ({ ...p, projectOwner: e.target.value }))} />
            {errors.projectOwner && <p className="text-xs text-red-600 mt-1">{errors.projectOwner}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter email" value={form.owner_email || ''} onChange={e => setForm(p => ({ ...p, owner_email: e.target.value }))} />
            {errors.owner_email && <p className="text-xs text-red-600 mt-1">{errors.owner_email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500" placeholder="Enter description" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
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
  const [page, setPage] = useState(10)
  const [modal, setModal] = useState(null)
  const [showAction, setShowAction] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => { dispatch(fetchAllProjects()); dispatch(fetchCustomerData()) }, [dispatch])
  useEffect(() => { setCurrentPage(1) }, [searchTerm, customerFilter])

  const q = searchTerm.toLowerCase()
  const filtered = projectsData.filter(p => {
    const matchesSearch =
      p.projectName?.toLowerCase().includes(q) ||
      p.projectOwner?.toLowerCase().includes(q) ||
      p.owner_email?.toLowerCase().includes(q) ||
      p.customerName?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    const matchesCustomer = customerFilter === 'All' || p.customerName === customerFilter
    return matchesSearch && matchesCustomer
  })

  const itemsPerPage = Number(page)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentProjects = filtered.slice(startIndex, startIndex + itemsPerPage)

  const uniqueCustomers = [...new Set(projectsData.map(p => p.customerName).filter(Boolean))]

  const handleSave = async (form) => {
    try {
      if (modal.mode === 'add') {
        const { customerId, ...projectData } = form
        await dispatch(addProject(customerId, projectData))
      } else {
        await dispatch(updateProject(modal.customerId, modal.index, {
          projectName: form.projectName,
          projectOwner: form.projectOwner,
          owner_email: form.owner_email,
          description: form.description,
        }))
      }
      setModal(null)
    } catch (_) {}
  }

  const handleDelete = async (proj) => {
    await dispatch(deleteProject(proj.customerId, proj.projectIndex))
    setShowAction(null)
  }

  return (
    <div>
      <div className="max-w-7xl lg:w-full md:w-full">
        {/* Action Bar */}
        <div className="sticky top-[88px] z-100 rounded-lg bg-white border-g border-gray-300 py-4 -mt-15 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, owner, email, customer..."
                className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-grey-500"
                  value={customerFilter}
                  onChange={e => setCustomerFilter(e.target.value)}
                >
                  <option value="All">All Customers</option>
                  {uniqueCustomers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setModal({ mode: 'add' })}
                disabled={!hasWrite}
                className={`flex items-center mr-2 gap-2 px-4 py-2 rounded-lg transition-colors ${hasWrite ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}
                title={!hasWrite ? "You don't have permission to add projects" : ''}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900">{projectsData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Customers with Projects</p>
            <p className="text-2xl font-bold text-blue-600">{uniqueCustomers.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600 mb-1">With Email</p>
            <p className="text-2xl font-bold text-green-600">{projectsData.filter(p => p.owner_email).length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-visible">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sl No</th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Owner Email</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                ) : currentProjects.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No projects found</td></tr>
                ) : (
                  currentProjects.map((proj, i) => (
                    <React.Fragment key={i}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(prev => prev === i ? null : i)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{i+1}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center gap-2">
                        {proj.projectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{proj.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 hidden md:table-cell">{proj.projectOwner}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 hidden lg:table-cell">{proj.owner_email || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); hasWrite && setModal({ mode: 'edit', customerId: proj.customerId, index: proj.projectIndex, project: proj }) }}
                            disabled={!hasWrite}
                            className={`transition-colors ${hasWrite ? 'cursor-pointer text-gray-600 hover:text-green-600' : 'cursor-not-allowed text-gray-300'}`}
                            title={!hasWrite ? 'No write permission' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); if (!hasDelete) return; setShowAction(prev => prev === i ? null : i) }}
                              disabled={!hasDelete}
                              className={`transition-colors ${hasDelete ? 'cursor-pointer text-gray-600 hover:text-red-600' : 'cursor-not-allowed text-gray-300'}`}
                              title={!hasDelete ? 'No delete permission' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {showAction === i && (
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-white shadow-xl border border-gray-200 rounded-lg p-5 pb-8 z-50">
                                <div className="text-center">
                                  <p className="text-gray-800 font-sm">
                                    Are you sure you want to delete <span className="font-bold capitalize">{proj.projectName}</span>?
                                  </p>
                                  <div className="flex justify-end gap-3 mt-4">
                                    <button onClick={() => setShowAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancel</button>
                                    <button onClick={() => handleDelete(proj)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition shadow-sm">Confirm</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr className="bg-blue-50">
                        <td colSpan={6} className="px-8 py-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                          <p className="text-sm text-gray-700">{proj.description || 'No description provided.'}</p>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} results
            </p>
            <div>
              <select onChange={e => setPage(e.target.value)} className="bg-gray-200 text-sm px-2 py-2 rounded-sm w-44">
                <option value={10}>All</option>
                <option value={1}>One</option>
                <option value={2}>Two</option>
                <option value={3}>Three</option>
              </select>
            </div>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === index + 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ProjectModal
          project={modal.mode === 'edit' ? modal.project : null}
          customers={customersData}
          existingProjects={projectsData}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
