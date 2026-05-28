import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Search, RefreshCcw, X, FileText, Eye, Download } from 'lucide-react'
import axiosInstance from '../../utils/axiosInstance'
import { assetSelector, fetchAssetData, createAsset, updateAsset, deleteAsset, updateAssetStatus } from '../../ReduxApi/asset'
import { assetCategorySelector, createAssetCategory, fetchAssetCategories } from '../../ReduxApi/assetCategory'
import { authSelector } from '../../ReduxApi/auth'
import { RowActions, Pagination, StatCard, InfoCard, Field, ConfirmModal, DataTable } from '../../shared/ui'
import { DonutChart, BarChartCard } from '../../shared/charts'
import { toast } from 'react-toastify'
import ManageAssetCategoriesModal from './ManageAssetCategoriesModal'
import { isTauri, sanitizeDownloadFileName, saveBytesToDownloads, showDownloadNotification } from '../../utils/pdfUtils'
const extractId = (item) =>
  item?.$oid ||
  item?._id?.$oid ||
  (typeof item?._id === 'string' ? item._id : null) ||
  item?.id?.$oid ||
  (typeof item?.id === 'string' ? item.id : null) ||
  (typeof item === 'string' ? item : '') ||
  ''

const extractCategoryName = (item) =>
  item?.category_name || item?.categoryName || item?.name || item?.title || ''

const normalizeCategoryOptions = (items) =>
  items.map((item) => ({ id: extractId(item), label: extractCategoryName(item) || 'Unnamed' }))

const STATUS_OPTIONS = ['active', 'repair', 'obsolete', 'maintenance']
const PAYMENT_OPTIONS = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'others']
const DESCRIPTION_WORD_LIMIT = 25
const NOTES_WORD_LIMIT = 25
const TAX_OPTIONS = ['0', '5', '12', '18', '28']

const limitWords = (value, maxWords) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return String(value || '')
  return words.slice(0, maxWords).join(' ')
}

const statusColor = (s) => {
  if (s === 'active') return 'bg-green-100 text-green-800'
  if (s === 'repair') return 'bg-yellow-100 text-yellow-800'
  if (s === 'maintenance') return 'bg-blue-100 text-blue-800'
  return 'bg-red-100 text-red-800'
}

const stockStatus = (stocks) => {
  const value = Number(stocks || 0)
  if (value <= 0) return 'Out of Stock'
  if (value <= 10) return 'Low Stock'
  return 'In Stock'
}

const stockCountClass = (stocks) => {
  const status = stockStatus(stocks)
  if (status === 'Out of Stock') return 'text-red-600'
  if (status === 'Low Stock') return 'text-amber-600'
  return 'text-emerald-700'
}

const textValue = (value, fallback = '') =>
  typeof value === 'string' ? value : value == null ? fallback : String(value)

const formatDate = (value) => {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '-' }
}

  const emptyForm = () => ({
  name: '', description: '', hsn: '', item_code: '', category: '',
  manufacturer: '', vendor: '', payment_mode: 'bank_transfer',
  stocks: '0', warranty_period: '', asset_status: 'active',
  sale_price: '', purchased_price: '', tax: '18', image: '',
  invoice_image: '',
  purchased_date: '', notes: '', assigned_date: '', assigned_to: '',
  serial_no: '', asset_type: 'owned',
})

export default function AssetList() {
  const dispatch = useDispatch()
  const { assetData, isLoading, hasLoadedOnce } = useSelector(assetSelector)
  const { assetCategoryData } = useSelector(assetCategorySelector)
  const { user } = useSelector(authSelector)
  const isAdmin = user?.is_admin

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [taxFilter, setTaxFilter] = useState('All')
  const [assetTypeFilter, setAssetTypeFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name-asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [assetImageFile, setAssetImageFile] = useState(null)
  const [assetImagePreview, setAssetImagePreview] = useState('')
  const [invoiceImageFile, setInvoiceImageFile] = useState(null)
  const [invoiceImagePreview, setInvoiceImagePreview] = useState('')
  const [imageCache, setImageCache] = useState({})
  const createdImageUrls = useRef(new Set())
  const [newCategoryName, setNewCategoryName] = useState('')
  const [previewModal, setPreviewModal] = useState({ open: false, src: '', title: '' })
  const [deleteModal, setDeleteModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const [descriptionPreview, setDescriptionPreview] = useState(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(!hasLoadedOnce)

  useEffect(() => {
    if (!hasLoadedOnce) {
      Promise.all([
        dispatch(fetchAssetData()),
        dispatch(fetchAssetCategories())
      ]).then(() => setIsInitialLoad(false))
    }
  }, [dispatch])

  const categoryOptions = useMemo(() => normalizeCategoryOptions(assetCategoryData || []), [assetCategoryData])
  const categoryMap = useMemo(() => {
    const m = new Map()
    categoryOptions.forEach((c) => m.set(c.id, c.label))
    return m
  }, [categoryOptions])

  const assets = useMemo(() => (Array.isArray(assetData) ? assetData : []).map((a) => {
    const catId = extractId(a.category) || a.category || ''
    return {
      id: extractId(a),
      name: a.name || '',
      description: a.description || '',
      hsn: a.hsn || '',
      item_code: a.item_code || '',
      category: catId,
      categoryLabel: categoryMap.get(catId) || extractCategoryName(a.category) || '',
      manufacturer: a.manufacturer || '',
      vendor: a.vendor || '',
      payment_mode: a.payment_mode || 'bank_transfer',
      stocks: Number(a.stocks || 0),
      soldStocks: Number(a.sold_stocks ?? a.soldStocks ?? 0),
      warranty_period: a.warranty_period || '',
      asset_status: a.asset_status || 'active',
      sale_price: Number(a.sale_price || 0),
      purchased_price: Number(a.purchased_price || 0),
      tax: Number(a.tax || 0),
      image: a.image || '',
      purchased_date: a.purchased_date || '',
      notes: a.notes || '',
      assigned_date: a.assigned_date || '',
      assigned_to: a.assigned_to || '',
      serial_no: a.serial_no || '',
      invoice_image: a.invoice_image || '',
      asset_type: a.asset_type || 'owned',
    }
  }), [assetData, categoryMap])

  useEffect(() => {
    let cancelled = false

    const loadImages = async () => {
      const filenames = [...new Set(assets.map((asset) => asset.image).filter(Boolean))]
      const invoiceFilenames = [...new Set(assets.map((asset) => asset.invoice_image).filter(Boolean))]

      const loadFile = async (filename, urlKey) => {
          if (/^https?:\/\//i.test(filename) || /^data:/i.test(filename)) {
            setImageCache((prev) => (prev[filename] ? prev : { ...prev, [filename]: filename }))
            return
          }
          try {
            const endpoint = urlKey === 'invoice' ? `/asset-invoice-images/${filename}` : `/asset-images/${filename}`
            const response = await axiosInstance.get(endpoint, { responseType: 'blob' })
            const objectUrl = URL.createObjectURL(response.data)
            createdImageUrls.current.add(objectUrl)
            if (!cancelled) {
              setImageCache((prev) => {
                if (prev[filename]) { URL.revokeObjectURL(objectUrl); createdImageUrls.current.delete(objectUrl); return prev }
                return { ...prev, [filename]: objectUrl }
              })
            } else {
              URL.revokeObjectURL(objectUrl); createdImageUrls.current.delete(objectUrl)
            }
          } catch (error) {
            console.error('Failed to load image:', filename, error)
          }
        }

      await Promise.all([
        ...filenames.map((f) => loadFile(f, 'asset')),
        ...invoiceFilenames.map((f) => loadFile(f, 'invoice')),
      ])
    }

    if (assets.length) {
      loadImages()
    }

    return () => {
      cancelled = true
    }
  }, [assets])

  useEffect(() => {
    const urls = createdImageUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, categoryFilter, stockFilter, taxFilter, assetTypeFilter, sortBy])

  useEffect(() => {
    if (!previewModal.open && !showModal && !statusModal) return
    document.body.setAttribute('data-modal-open', '1')
    return () => document.body.removeAttribute('data-modal-open')
  }, [previewModal.open, showModal, statusModal])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = assets.filter((a) => {
      const matchSearch = !q || [
        a.name,
        a.description,
        a.item_code,
        a.categoryLabel,
        a.manufacturer,
        a.vendor,
        a.hsn,
      ].some((v) => String(v || '').toLowerCase().includes(q))
      const matchStatus = statusFilter === 'All' || a.asset_status === statusFilter
      const matchCat = categoryFilter === 'All' || a.category === categoryFilter
      const stock = stockStatus(a.stocks).toLowerCase()
      const matchStock = stockFilter === 'All' || stock.includes(stockFilter)
      const matchTax = taxFilter === 'All' || String(a.tax) === taxFilter
      const matchAssetType = assetTypeFilter === 'All' || a.asset_type === assetTypeFilter
      return matchSearch && matchStatus && matchCat && matchStock && matchTax && matchAssetType
    })

    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'stock-asc') return a.stocks - b.stocks
      if (sortBy === 'stock-desc') return b.stocks - a.stocks
      if (sortBy === 'price-asc') return a.sale_price - b.sale_price
      if (sortBy === 'price-desc') return b.sale_price - a.sale_price
      return 0
    })

    return sorted
  }, [assets, search, statusFilter, categoryFilter, stockFilter, taxFilter, assetTypeFilter, sortBy])

  const summary = useMemo(() => {
    const total = filtered.length
    const active = filtered.filter((a) => a.asset_status === 'active').length
    const repair = filtered.filter((a) => a.asset_status === 'repair').length
    const inventoryValue = filtered.reduce((sum, a) => sum + a.sale_price * a.stocks, 0)
    return { total, active, repair, inventoryValue }
  }, [filtered])

  const statusData = useMemo(() => {
    const counts = {
      Active: summary.active,
      Repair: summary.repair,
      Other: filtered.length - summary.active - summary.repair,
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
  }, [filtered, summary])

  const categoryDistribution = useMemo(() => {
    const counts = new Map()
    filtered.forEach((asset) => {
      const label = textValue(asset.categoryLabel, 'Unassigned') || 'Unassigned'
      counts.set(label, (counts.get(label) || 0) + 1)
    })
    const sorted = [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    if (sorted.length <= 5) return sorted
    const top = sorted.slice(0, 4)
    const otherValue = sorted.slice(4).reduce((sum, item) => sum + item.value, 0)
    if (otherValue > 0) top.push({ name: 'Other', value: otherValue })
    return top
  }, [filtered])

  const purchaseValueData = useMemo(() => {
    const counts = new Map()
    filtered.forEach((a) => {
      const label = textValue(a.categoryLabel, 'Unassigned') || 'Unassigned'
      counts.set(label, (counts.get(label) || 0) + a.purchased_price)
    })
    const sorted = [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    if (sorted.length <= 4) return sorted
    const top = sorted.slice(0, 3)
    const otherValue = sorted.slice(3).reduce((sum, item) => sum + item.value, 0)
    if (otherValue > 0) top.push({ name: 'Other', value: otherValue })
    return top
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(nextPage)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm(), category: categoryOptions[0]?.id || '' })
    setAssetImageFile(null)
    setAssetImagePreview('')
    setInvoiceImageFile(null)
    setInvoiceImagePreview('')
    setNewCategoryName('')
    setShowModal(true)
  }

  const openEdit = (a) => {
    setEditingId(a.id)
    setForm({
      name: a.name, description: a.description, hsn: a.hsn, item_code: a.item_code,
      category: a.category, manufacturer: a.manufacturer, vendor: a.vendor,
      payment_mode: a.payment_mode, stocks: String(a.stocks), warranty_period: a.warranty_period,
      asset_status: a.asset_status, sale_price: String(a.sale_price),
      purchased_price: String(a.purchased_price), tax: String(a.tax), image: a.image,
      invoice_image: a.invoice_image,
      purchased_date: a.purchased_date, notes: a.notes,
      assigned_date: a.assigned_date, assigned_to: a.assigned_to,
      serial_no: a.serial_no, asset_type: a.asset_type,
    })
    setAssetImageFile(null)
    setAssetImagePreview(imageCache[a.image] || '')
    setInvoiceImageFile(null)
    setInvoiceImagePreview(imageCache[a.invoice_image] || '')
    setNewCategoryName('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm())
    setAssetImageFile(null)
    setAssetImagePreview('')
    setInvoiceImageFile(null)
    setInvoiceImagePreview('')
    setNewCategoryName('')
    closePreviewModal()
  }

  const openPreviewModal = (src, title = 'Image Preview', isPdf = false) => {
    if (!src) return
    setPreviewModal({ open: true, src, title, isPdf })
  }

  const closePreviewModal = () => {
    setPreviewModal({ open: false, src: '', title: '' })
  }

  const openDescriptionPreview = (event, asset) => {
    if (!asset?.description) return
    const rect = event.currentTarget.getBoundingClientRect()
    const popupWidth = Math.min(360, window.innerWidth - 32)
    const popupHeight = 180
    const spaceRight = window.innerWidth - rect.right
    const spaceBelow = window.innerHeight - rect.top
    const left =
      spaceRight >= popupWidth + 16
        ? rect.right + 12
        : Math.max(12, rect.left - popupWidth - 12)
    const top =
      spaceBelow >= popupHeight + 16
        ? rect.top
        : Math.max(12, window.innerHeight - popupHeight - 16)

    setDescriptionPreview({
      title: asset.name || 'Description',
      description: asset.description,
      left,
      top,
    })
  }

  const closeDescriptionPreview = () => {
    setDescriptionPreview(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'description' ? limitWords(value, DESCRIPTION_WORD_LIMIT)
             : name === 'notes'       ? limitWords(value, NOTES_WORD_LIMIT)
             : value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null
    if (file) {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        toast.error('Only image files are allowed for asset image')
        e.target.value = ''
        return
      }
    }
    setAssetImageFile(file)
    setAssetImagePreview(file ? URL.createObjectURL(file) : '')
  }

  const handleInvoiceImageChange = (e) => {
    const file = e.target.files?.[0] || null
    if (file) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      if (!isImage && !isPdf) {
        toast.error('Only image or PDF files are allowed')
        e.target.value = ''
        return
      }
    }
    setInvoiceImageFile(file)
    setInvoiceImagePreview(file ? URL.createObjectURL(file) : '')
  }

  const isFilePdf = (file) => file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')
  const isSrcPdf = (src) => typeof src === 'string' && src.toLowerCase().includes('.pdf')

  const handleAddCategory = async () => {
    const category_name = newCategoryName.trim()
    if (!category_name) return

    const created = await dispatch(createAssetCategory(category_name))
    const createdId = extractId(created) || extractId(created?.data) || extractId(created?.category)

    if (createdId) {
      setForm((prev) => ({ ...prev, category: createdId }))
      setNewCategoryName('')
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Asset name is required')
      return
    }
    if (!form.category || form.category === '__add_category__') {
      toast.error('Please select or create a category before saving the asset')
      return
    }

    const payload = {
      ...form,
      imageFile: assetImageFile,
      invoiceImageFile: invoiceImageFile,
      stocks: Number(form.stocks || 0),
      sale_price: Number(form.sale_price || 0),
      purchased_price: Number(form.purchased_price || 0),
      tax: Number(form.tax || 0),
      purchased_date: form.purchased_date || '',
      notes: form.notes || '',
      assigned_date: form.assigned_date || '',
      assigned_to: form.assigned_to || '',
    }

    if (editingId) {
      await dispatch(updateAsset(editingId, payload))
    } else {
      await dispatch(createAsset(payload))
    }
    closeModal()
  }

  const handleDelete = async (id) => {
    await dispatch(deleteAsset(id))
    setDeleteModal(null)
  }

  const handleStatusChange = async (id, status) => {
    await dispatch(updateAssetStatus(id, status))
    setStatusModal(null)
  }

  const downloadFromSource = async (src, title = 'download', isPdf = false) => {
    if (!src) return
    const ext = isPdf ? 'pdf' : 'jpg'
    let fileName = sanitizeDownloadFileName(`${title || 'download'}.${ext}`)
    let filePath = null
    try {
      if (isTauri()) {
        const res = await fetch(src)
        const buffer = await res.arrayBuffer()
        const saved = await saveBytesToDownloads(new Uint8Array(buffer), fileName)
        fileName = saved.fileName
        filePath = saved.filePath
      } else {
        const a = document.createElement('a')
        a.href = src
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (e) {
      console.error('Download failed:', e)
      const a = document.createElement('a')
      a.href = src
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    showDownloadNotification(fileName, filePath)
  }

  const handleDownload = async () => {
    await downloadFromSource(previewModal.src, previewModal.title, previewModal.isPdf)
  }

  const fmt = (v) => Number(v || 0).toLocaleString('en-IN')
  const assetImageSrc = (asset) => imageCache[asset.image] || ''
  const activeModalImageSrc = assetImageFile ? assetImagePreview : imageCache[form.image] || assetImagePreview || ''

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toolbar skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="h-12 bg-slate-200 rounded-xl animate-pulse w-full md:max-w-xl"></div>
          <div className="flex items-center gap-2">
            <div className="h-12 w-24 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-12 w-28 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-12 w-20 bg-slate-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-4 bg-slate-200 rounded animate-pulse mb-2 w-20"></div>
            <div className="h-8 bg-slate-200 rounded animate-pulse w-16"></div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="h-5 bg-slate-200 rounded animate-pulse w-12"></div>
          <div className="flex flex-wrap gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4">
          {/* Table header */}
          <div className="grid grid-cols-9 gap-4 pb-4 border-b border-slate-200">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse"></div>
            ))}
          </div>
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-9 gap-4 py-4 border-b border-slate-100">
              {[...Array(9)].map((_, j) => (
                <div key={j} className="h-4 bg-slate-100 rounded animate-pulse"></div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-32"></div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )

  if (isInitialLoad) return <LoadingSkeleton />

  return (
    <div className="w-full ">
      {/* Subtle loading overlay for refreshes when data exists */}
      {isLoading && hasLoadedOnce && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
            <RefreshCcw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Refreshing assets...</span>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, item code, manufacturer..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => dispatch(fetchAssetData())}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            {isAdmin && (
              <button onClick={() => setShowCategoryManager(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Categories
              </button>
            )}
            {isAdmin && (
              <button onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Create
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
        <StatCard label="Total Assets" value={summary.total} />
        <StatCard label="Active" value={summary.active} valueClass="text-emerald-700" />
        <StatCard label="In Repair" value={summary.repair} valueClass="text-amber-600" />
        <StatCard label="Inventory Value" value={`Rs. ${fmt(summary.inventoryValue)}`} valueClass="text-blue-700" />
      </div>

            {summary.total > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3 mb-2 h-full">
          <DonutChart
            title="Asset status distribution"
            subtitle="See how the current asset population is split by status."
            badge={`${summary.total} items`}
            data={statusData}
            colors={['#34d399', '#fbbf24', '#cbd5e1']}
            tooltipLabel="Assets"
          />
          <DonutChart
            title="Asset categories"
            subtitle="Top categories by asset count in the current view."
            data={categoryDistribution}
            colors={['#60a5fa', '#818cf8', '#38bdf8', '#f97316', '#a855f7']}
            tooltipLabel="Assets"
          />
          <BarChartCard
            title="Purchase value by category"
            subtitle="Total procurement spend per category."
            data={purchaseValueData}
            colors={['#34d399', '#818cf8', '#f97316', '#f59e0b']}
            tooltipFormatter={(v) => [`Rs. ${fmt(v)}`, 'Spend']}
          />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-2">
        <div className="flex flex-col gap-3 items-end justify-end">
         
          <div className="flex flex-wrap gap-3">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="All">All Categories</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            
            
            <select value={assetTypeFilter} onChange={(e) => setAssetTypeFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="All">All Types</option>
              <option value="owned">Owned</option>
              <option value="rental">Rented</option>
            </select>
            
          </div>
        </div>
      </div>

      <DataTable
        isLoading={isLoading && !isInitialLoad}
        data={paginated}
        rowKey={(a) => a.id}
        wrapperClass="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        tbodyClass="divide-y divide-slate-200"
        emptyMessage="No assets matched your filters."
        loadingMessage="Loading assets..."
        columns={[
          {
            label: 'Image', stopPropagation: true,
            render: (a) => a.image ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); const src = assetImageSrc(a); if (src) openPreviewModal(src, a.name || 'Asset Image') }} className="block">
                <img src={assetImageSrc(a)} alt={a.name} onError={(e) => { e.currentTarget.style.display = 'none' }} className="h-8 w-10 rounded-lg object-cover border border-slate-200" />
              </button>
            ) : <div className="h-8 w-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No img</div>,
          },
          {
            label: 'Name',
            render: (a) => (
              <><div className="whitespace-nowrap text-sm font-semibold text-slate-900">{a.name}</div><div className="text-xs text-slate-400">{a.manufacturer || a.vendor}</div></>
            ),
          },
          {
            label: 'Description',
            render: (a) => (
              <div className="text-xs text-slate-600 line-clamp-2 cursor-help max-w-[140px]" onMouseEnter={(e) => openDescriptionPreview(e, a)} onMouseLeave={closeDescriptionPreview}>{a.description || '-'}</div>
            ),
          },
          { label: 'HSN/CAC', render: (a) => <span className="text-xs text-slate-700">{a.hsn || '-'}</span> },
          { label: 'Item Code', render: (a) => <span className="text-xs text-slate-700">{a.item_code || '-'}</span> },
          { label: 'Category', render: (a) => <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{textValue(a.categoryLabel, 'Unassigned') || 'Unassigned'}</span> },

          {
            label: 'Status', stopPropagation: true,
            render: (a) => isAdmin ? (
              <button type="button" onClick={() => setStatusModal({ id: a.id, current: a.asset_status })} className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold cursor-pointer ${statusColor(a.asset_status)}`}>{a.asset_status ? a.asset_status.charAt(0).toUpperCase() + a.asset_status.slice(1) : '-'}</button>
            ) : (
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColor(a.asset_status)}`}>{a.asset_status ? a.asset_status.charAt(0).toUpperCase() + a.asset_status.slice(1) : '-'}</span>
            ),
          },
          { label: 'Purchase Price', render: (a) => <span className="text-xs font-semibold text-slate-900">Rs. {fmt(a.purchased_price)}</span> },
          {
            label: 'Actions', right: true, stopPropagation: true,
            render: (a) => (
              <div className="flex items-center justify-end gap-2">
                {/* {a.invoice_image && imageCache[a.invoice_image] && (
                  <button
                    type="button"
                    title="View Invoice"
                    onClick={() => openPreviewModal(imageCache[a.invoice_image], 'Invoice / Receipt', isSrcPdf(a.invoice_image))}
                    className="text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )} */}
                <RowActions onEdit={() => openEdit(a)} onDelete={() => setDeleteModal({ id: a.id, name: a.name })} canEdit={isAdmin} canDelete={isAdmin} />
              </div>
            ),
          },
        ]}
        renderExpanded={(a) => {
          const inStock = Math.max(Number(a.stocks || 0) - Number(a.soldStocks || 0), 0)
          const pct = Number(a.stocks || 0) > 0 ? Math.round((inStock / Number(a.stocks || 0)) * 100) : 0
          const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500'
          const invoiceSrc = a.invoice_image ? imageCache[a.invoice_image] : ''
          const invoiceIsPdf = isSrcPdf(a.invoice_image)
          return (
            <div className="p-4 rounded-2xl bg-[#ECEEF2]">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                <InfoCard label="Description" value={a.description || '-'} className="xl:col-span-3" valueClassName="line-clamp-2 min-h-[2.5rem]" />
                <InfoCard label="Manufacturer" value={a.manufacturer || '-'} />
                <InfoCard label="Vendor" value={a.vendor || '-'} />
                <InfoCard label="Payment Mode" value={String(a.payment_mode || '-').replace('_', ' ')} />
                <InfoCard label="Warranty" value={a.warranty_period || '-'} />
                <InfoCard label="Purchased Price" value={`Rs. ${fmt(a.purchased_price)}`} />
                <InfoCard label="Tax" value={`${a.tax}%`} />
                {/* <InfoCard label="In Stock" value={`${inStock} (${pct}%)`} /> */}
                <InfoCard label="Purchased Date" value={formatDate(a.purchased_date)} />
                <InfoCard label="Assigned To" value={a.assigned_to || '-'} />
                <InfoCard label="Assigned Date" value={formatDate(a.assigned_date)} />
                <InfoCard label="Serial No" value={a.serial_no || '-'} />
                <InfoCard label="Asset Type" value={a.asset_type ? a.asset_type.charAt(0).toUpperCase() + a.asset_type.slice(1) : '-'} />
                <InfoCard label="Notes" value={a.notes || '-'} className="xl:col-span-3" />
                <div className="xl:col-span-1 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice / Receipt</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{a.invoice_image ? 'Available' : '-'}</p>
                  <div className="mt-3 flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => invoiceSrc && openPreviewModal(invoiceSrc, 'Invoice / Receipt', invoiceIsPdf)}
                      disabled={!invoiceSrc}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => invoiceSrc && downloadFromSource(invoiceSrc, `${a.name || 'Asset'} Invoice Receipt`, invoiceIsPdf)}
                      disabled={!invoiceSrc}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
                {/* <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stock Level</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-200"><div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                  </div>
                </div> */}
              </div>
            </div>
          )
        }}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize}
        totalCount={filtered.length} onPageChange={goToPage}
        onPageSizeChange={(n) => { setPageSize(Number(n)); setCurrentPage(1) }} />

      {previewModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/75 p-4" onClick={closePreviewModal}>
          <div className="max-w-5xl w-full rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-semibold text-slate-900">{previewModal.title}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDownload} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Download">
                  <Download className="h-5 w-5" />
                </button>
                <button type="button" onClick={closePreviewModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              {previewModal.isPdf ? (
                <iframe
                  src={`${previewModal.src}#toolbar=0`} 
                  title={previewModal.title}
                  className="w-full rounded-xl"
                  style={{ height: '75vh' }}
                />
              ) : (
                <img src={previewModal.src} alt={previewModal.title} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {descriptionPreview && (
        <div
          className="pointer-events-none fixed w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          style={{ zIndex: 250, left: descriptionPreview.left, top: descriptionPreview.top }}
        >
          <h4 className="mt-1 text-base font-semibold text-slate-900">{descriptionPreview.title}</h4>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-700">
            {descriptionPreview.description}
          </p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Asset' : 'Create New Asset'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingId ? 'Update the asset and save the changes.' : 'Fill in the asset details to create a new asset.'}
                </p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Asset Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => activeModalImageSrc && openPreviewModal(activeModalImageSrc, form.name || 'Asset Image')}
                    disabled={!activeModalImageSrc}
                    className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center disabled:cursor-not-allowed"
                  >
                    {activeModalImageSrc ? (
                      <img src={activeModalImageSrc} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 text-sm text-slate-500">
                    <p className="truncate">
                      {assetImageFile ? assetImageFile.name : 'Choose an asset image to preview it here.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => activeModalImageSrc && openPreviewModal(activeModalImageSrc, form.name || 'Asset Image')}
                        disabled={!activeModalImageSrc}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice / Receipt Image */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice / Receipt Image</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleInvoiceImageChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                {(invoiceImagePreview || imageCache[form.invoice_image]) && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const src = invoiceImageFile ? invoiceImagePreview : imageCache[form.invoice_image]
                        const pdf = invoiceImageFile ? isFilePdf(invoiceImageFile) : isSrcPdf(form.invoice_image)
                        if (src) openPreviewModal(src, 'Invoice / Receipt', pdf)
                      }}
                      className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
                    >
                      {(invoiceImageFile ? isFilePdf(invoiceImageFile) : isSrcPdf(form.invoice_image)) ? (
                        <span className="text-xs font-semibold text-red-500">PDF</span>
                      ) : (
                        <img
                          src={invoiceImageFile ? invoiceImagePreview : imageCache[form.invoice_image]}
                          alt="Invoice preview"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 text-sm text-slate-500">
                      <p className="truncate">{invoiceImageFile ? invoiceImageFile.name : 'Existing invoice file'}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const src = invoiceImageFile ? invoiceImagePreview : imageCache[form.invoice_image]
                          const pdf = invoiceImageFile ? isFilePdf(invoiceImageFile) : isSrcPdf(form.invoice_image)
                          if (src) openPreviewModal(src, 'Invoice / Receipt', pdf)
                        }}
                        className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Asset Name *" name="name" value={form.name} onChange={handleChange} placeholder="Enter asset name" />
              <Field label="Description" name="description" value={form.description} onChange={handleChange} placeholder={`Enter description, up to ${DESCRIPTION_WORD_LIMIT} words`} />
              <Field label="HSN/CAC" name="hsn" value={form.hsn} onChange={handleChange} placeholder="HSN code" />
              <Field label="Item Code" name="item_code" value={form.item_code} onChange={handleChange} placeholder="Item / SKU code" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                <select name="category" value={form.category} onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="" disabled>Select category</option>
                  <option value="__add_category__">+ Add new category</option>
                  {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                {form.category === '__add_category__' && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      New Category
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="Manufacturer name" />
              <Field label="Supplier" name="vendor" value={form.vendor} onChange={handleChange} placeholder="Vendor / supplier" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode</label>
                <select name="payment_mode" value={form.payment_mode} onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                </select>
              </div>

              {/* <Field label="Stocks" name="stocks" type="number" value={form.stocks} onChange={handleChange} placeholder="0" /> */}
              <Field label="Warranty Period" name="warranty_period" value={form.warranty_period} onChange={handleChange} placeholder="e.g. 1 year" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Asset Status</label>
                <select name="asset_status" value={form.asset_status} onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <Field label="Purchased Date" name="purchased_date" type="date" value={form.purchased_date} onChange={handleChange} />

              {/* <Field label="Sale Price" name="sale_price" type="number" value={form.sale_price} onChange={handleChange} placeholder="0" /> */}
              <Field label="Purchased Price" name="purchased_price" type="number" value={form.purchased_price} onChange={handleChange} placeholder="0" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tax %</label>
                <select name="tax" value={form.tax} onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {['0', '5', '12', '18', '28'].map((t) => <option key={t} value={t}>{t}%</option>)}
                </select>
              </div>

              <Field label="Serial No" name="serial_no" value={form.serial_no} onChange={handleChange} placeholder="Serial number" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Asset Type</label>
                <select name="asset_type" value={form.asset_type} onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="owned">Owned</option>
                  <option value="rental">Rental</option>
                </select>
              </div>
              <Field label="Assigned To" name="assigned_to" value={form.assigned_to} onChange={handleChange} placeholder="Person or department" />
              <Field label="Assigned Date" name="assigned_date" type="date" value={form.assigned_date} onChange={handleChange} />
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder={`Any additional notes (up to ${NOTES_WORD_LIMIT} words)...`}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className={`mt-1 text-xs text-right ${
                  form.notes.trim().split(/\s+/).filter(Boolean).length >= NOTES_WORD_LIMIT
                    ? 'text-red-500 font-medium'
                    : 'text-slate-400'
                }`}>
                  {form.notes.trim().split(/\s+/).filter(Boolean).length} / {NOTES_WORD_LIMIT} words
                </p>
              </div>

            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 shrink-0">
              <button onClick={closeModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} disabled={isLoading || !form.name.trim() || !form.category}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete <span className="font-medium">{deleteModal.name}</span>?</>}
          onConfirm={() => handleDelete(deleteModal.id)}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* Status Modal */}
      {statusModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Update Status</h3>
            <select defaultValue={statusModal.current}
              onChange={(e) => setStatusModal((prev) => ({ ...prev, selected: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-4">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStatusModal(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleStatusChange(statusModal.id, statusModal.selected || statusModal.current)}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Update</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showCategoryManager && (
        <ManageAssetCategoriesModal onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  )
}
