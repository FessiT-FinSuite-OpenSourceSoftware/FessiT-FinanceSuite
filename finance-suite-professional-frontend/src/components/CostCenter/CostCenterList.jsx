import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchCostCenters, deleteCostCenter, costCenterSelector } from '../../ReduxApi/costCenter'
import { authSelector } from '../../ReduxApi/auth'
import { canWrite, canDelete, Module } from '../../utils/permissions'
import { TabActionBar, StatCard, TableWrapper, TableHead, EmptyRow, RowActions, Pagination, ConfirmModal } from '../../shared/ui'

export default function CostCenterList() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const { costCenters, isLoading } = useSelector(costCenterSelector)
  const { user } = useSelector(authSelector)
  const [search, setSearch] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const hasWrite = canWrite(user, Module.Customers)
  const hasDelete = canDelete(user, Module.Customers)

  useEffect(() => { dispatch(fetchCostCenters()) }, [dispatch])

  const all = Array.isArray(costCenters) ? costCenters : []
  const filtered = all.filter((cc) =>
    (cc.costCenterNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (cc.projectName || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const getId = (cc) => cc._id?.$oid || cc._id || cc.id || ''

  return (
    <div>
      <TabActionBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Search by number or project name...">
        <button
          onClick={() => hasWrite && nav('/cost-centers/add')}
          disabled={!hasWrite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            hasWrite ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create</span>
        </button>
      </TabActionBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cost Centers" value={all.length} />
        <StatCard label="Active" value={all.filter((cc) => (cc.status || 'Active') === 'Active').length} valueClass="text-green-600" />
        <StatCard label="Closed" value={all.filter((cc) => cc.status === 'Closed').length} valueClass="text-red-600" />
        <StatCard label="Latest Project" value={all[all.length - 1]?.projectName || '—'} />
      </div>

      <TableWrapper>
        <TableHead columns={[
          { label: 'Cost Center No' }, { label: 'Project Name' },
          { label: 'Status' }, { label: 'Description' }, { label: 'Actions', right: true },
        ]} />
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <EmptyRow colSpan={5} message="Loading..." />
          ) : paginated.length === 0 ? (
            <EmptyRow colSpan={5} message="No cost centers found." />
          ) : paginated.map((cc) => {
            const id = getId(cc)
            return (
              <tr key={id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 font-medium text-blue-600 cursor-pointer whitespace-nowrap" onClick={() => nav(`/cost-centers/edit/${id}`)}>{cc.costCenterNumber}</td>
                <td className="px-4 py-2 whitespace-nowrap">{cc.projectName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    cc.status === 'Active' ? 'bg-green-100 text-green-800' :
                    cc.status === 'Closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>{cc.status || 'Active'}</span>
                </td>
                <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{cc.description}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">
                  <RowActions
                    onEdit={() => hasWrite && nav(`/cost-centers/edit/${id}`)}
                    onDelete={() => hasDelete && setDeleteModal({ id, name: cc.costCenterNumber || 'This cost center' })}
                    canEdit={hasWrite} canDelete={hasDelete}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableWrapper>

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalCount={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }} />

      {deleteModal && (
        <ConfirmModal
          message={<>Are you sure you want to delete <span className="font-medium">{deleteModal.name}</span>?</>}
          onConfirm={() => { dispatch(deleteCostCenter(deleteModal.id)); setDeleteModal(null); }}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
