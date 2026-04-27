import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createCostCenter } from '../../ReduxApi/costCenter'
import { fetchCustomerData, fetchCustomerProjects, customerSelector } from '../../ReduxApi/customer'

const initial = { projectName: '', customerId: '', status: 'Active', description: '' }

export default function AddCostCenter() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const { customersData, customerProjects } = useSelector(customerSelector)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  useEffect(() => { dispatch(fetchCustomerData()) }, [dispatch])

  const getId = (c) => c._id?.$oid || c._id || c.id || ''

  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    setForm((prev) => ({ ...prev, customerId, projectName: '' }))
    if (errors.customerId) setErrors((prev) => { const u = { ...prev }; delete u.customerId; return u })
    if (customerId) dispatch(fetchCustomerProjects(customerId))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => { const u = { ...prev }; delete u[name]; return u })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!form.projectName.trim()) newErrors.projectName = 'Project is required'
    if (!form.customerId) newErrors.customerId = 'Customer is required'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    await dispatch(createCostCenter(form))
    nav('/cost-centers')
  }

  return (
    <div className="relative">
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-gray-300 py-4 -mt-15 shadow-sm">
        <div className="flex justify-between">
          <div className="px-4 py-2">
            <ArrowLeft strokeWidth={1} className="cursor-pointer" onClick={() => nav('/cost-centers')} />
          </div>
          <div className="flex gap-2 mr-5">
            <button onClick={handleSubmit}
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-blue-600 hover:border-blue-500 hover:text-blue-600 transition-all">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
          New Cost Center
        </h2>
        <div className="grid grid-cols-2 gap-6 text-sm">

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Customer *</label>
            <select name="customerId" value={form.customerId} onChange={handleCustomerChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500">
              <option value="">Select customer</option>
              {(Array.isArray(customersData) ? customersData : []).map((c) => (
                <option key={getId(c)} value={getId(c)}>
                  {c.customerName} {c.CustomerCode ? `(${c.CustomerCode})` : ''}
                </option>
              ))}
            </select>
            {errors.customerId && <p className="absolute text-[13px] text-red-500">{errors.customerId}</p>}
          </div>

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Project *</label>
            <select name="projectName" value={form.projectName} onChange={handleChange}
              disabled={!form.customerId}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">{form.customerId ? 'Select project' : 'Select a customer first'}</option>
              {customerProjects.map((p, i) => (
                <option key={i} value={p.projectName}>{p.projectName}</option>
              ))}
            </select>
            {errors.projectName && <p className="absolute text-[13px] text-red-500">{errors.projectName}</p>}
          </div>

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500">
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="relative col-span-2">
            <label className="block text-gray-700 font-medium mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Enter description"
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500 h-20" />
          </div>

        </div>
      </div>
    </div>
  )
}
