import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchOneCostCenter, updateCostCenter, costCenterSelector } from '../../ReduxApi/costCenter'

export default function EditCostCenter() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const { id } = useParams()
  const { currentCostCenter } = useSelector(costCenterSelector)
  const [form, setForm] = useState({ projectName: '', status: '', description: '' })

  useEffect(() => { dispatch(fetchOneCostCenter(id)) }, [dispatch, id])

  useEffect(() => {
    if (currentCostCenter) {
      setForm({
        projectName: currentCostCenter.projectName || '',
        status: currentCostCenter.status || 'Active',
        description: currentCostCenter.description || '',
      })
    }
  }, [currentCostCenter])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(updateCostCenter(id, form))
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
              className="px-6 py-2 cursor-pointer text-black rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              Update
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mt-10">
        <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Edit Cost Center</h2>
          {currentCostCenter?.costCenterNumber && (
            <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded text-gray-700">
              {currentCostCenter.costCenterNumber}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">

          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Project Name *</label>
            <input type="text" name="projectName" value={form.projectName} onChange={handleChange}
              placeholder="Enter project name"
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-1 focus:ring-blue-500" />
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
