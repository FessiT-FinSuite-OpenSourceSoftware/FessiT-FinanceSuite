import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { fetchCostCenters, deleteCostCenter, costCenterSelector } from '../../ReduxApi/costCenter'
import { authSelector } from '../../ReduxApi/auth'
import { canWrite, canDelete, Module } from '../../utils/permissions'

export default function CostCenterList() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const { costCenters, isLoading } = useSelector(costCenterSelector)
  const { user } = useSelector(authSelector)
  const [search, setSearch] = useState('')

  const hasWrite = canWrite(user, Module.Customers)
  const hasDelete = canDelete(user, Module.Customers)

  useEffect(() => { dispatch(fetchCostCenters()) }, [dispatch])

  const filtered = (Array.isArray(costCenters) ? costCenters : []).filter((cc) =>
    (cc.costCenterNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (cc.projectName || '').toLowerCase().includes(search.toLowerCase())
  )

  const all = Array.isArray(costCenters) ? costCenters : []
  const activeCount = all.filter((cc) => (cc.status || 'Active') === 'Active').length
  const closedCount = all.filter((cc) => cc.status === 'Closed').length
  const latestProject = all[all.length - 1]

  const handleDelete = (id) => {
    if (!window.confirm('Delete this cost center?')) return
    dispatch(deleteCostCenter(id))
  }

  const getId = (cc) => cc._id?.$oid || cc._id || cc.id || ''

  return (
    <div>
      <div className="sticky top-[88px] z-100 rounded-lg bg-white border-gray-300 py-4 mt-2 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by number or project name..."
              className="w-full ml-2 pl-10 pr-4 py-2 border border-gray-700 rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => hasWrite && nav('/cost-centers/add')}
            disabled={!hasWrite}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg mr-2 ${
              hasWrite ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Cost Centers</p>
          <p className="text-2xl font-bold text-gray-900">{all.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Closed</p>
          <p className="text-2xl font-bold text-red-600">{closedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Latest Project</p>
          {latestProject ? (
            <>
              <p className="text-sm font-semibold text-gray-800 truncate">{latestProject.projectName || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{latestProject.costCenterNumber}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Cost Center No', 'Project Name', 'Status', 'Description', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No cost centers found.</td></tr>
              ) : filtered.map((cc) => {
                const id = getId(cc)
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-blue-600 cursor-pointer whitespace-nowrap"
                      onClick={() => nav(`/cost-centers/edit/${id}`)}>
                      {cc.costCenterNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{cc.projectName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cc.status === 'Active' ? 'bg-green-100 text-green-800' :
                        cc.status === 'Closed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{cc.status || 'Active'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{cc.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => hasWrite && nav(`/cost-centers/edit/${id}`)} disabled={!hasWrite}
                          className={hasWrite ? 'text-gray-600 hover:text-green-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => hasDelete && handleDelete(id)} disabled={!hasDelete}
                          className={hasDelete ? 'text-gray-600 hover:text-red-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
