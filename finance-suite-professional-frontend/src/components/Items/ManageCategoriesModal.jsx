import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Pencil, Trash2, X, Check, Tag } from 'lucide-react'
import { categorySelector, fetchCategories, updateCategory, deleteCategory, createCategory } from '../../ReduxApi/category'
import { authSelector } from '../../ReduxApi/auth'

const extractId = (item) =>
  item?._id?.$oid || item?._id || item?.id?.$oid || item?.id || ''

export default function ManageCategoriesModal({ onClose }) {
  const dispatch = useDispatch()
  const { categoryData, isLoading } = useSelector(categorySelector)
  const { user } = useSelector(authSelector)
  const isAdmin = user?.is_admin

  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [newName, setNewName] = useState('')

  const categories = Array.isArray(categoryData) ? categoryData : []

  useEffect(() => {
    document.body.setAttribute('data-modal-open', '1')
    return () => document.body.removeAttribute('data-modal-open')
  }, [])

  const startEdit = (cat) => {
    setEditingId(extractId(cat))
    setEditValue(cat.category_name || cat.categoryName || cat.name || '')
    setDeleteConfirmId(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditValue('') }

  const handleUpdate = async (id) => {
    if (!editValue.trim()) return
    await dispatch(updateCategory(id, editValue.trim()))
    setEditingId(null)
    setEditValue('')
  }

  const handleDelete = async (id) => {
    await dispatch(deleteCategory(id))
    setDeleteConfirmId(null)
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    await dispatch(createCategory(newName.trim()))
    setNewName('')
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md flex flex-col h-[60vh] rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Manage Categories</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add new */}
        {isAdmin && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="New category name..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || isLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {isLoading && categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No categories yet.</p>
          ) : categories.map((cat) => {
            const id = extractId(cat)
            const name = cat.category_name || cat.categoryName || cat.name || ''
            const isEditing = editingId === id
            const isConfirmingDelete = deleteConfirmId === id

            return (
              <div key={id} className="flex items-center gap-2 rounded-xl  py-1 px-0.5 hover:bg-slate-50 group">
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(id); if (e.key === 'Escape') cancelEdit() }}
                      className="flex-1 rounded-lg border border-blue-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={() => handleUpdate(id)} className="text-green-600 hover:text-green-700 p-1">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : isConfirmingDelete ? (
                  <>
                    <span className="flex-1 text-sm text-red-600">Delete <strong>{name}</strong>?</span>
                    <button onClick={() => handleDelete(id)} className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-2 py-1">
                      Yes
                    </button>
                    <button onClick={() => setDeleteConfirmId(null)} className="text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-50">
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700">{name}</span>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(cat)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteConfirmId(id); setEditingId(null) }} className="p-1 text-slate-400 hover:text-red-600 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
