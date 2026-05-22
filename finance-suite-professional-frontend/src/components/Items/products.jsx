import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Plus, Search, RefreshCcw, X, Info } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import { categorySelector, createCategory, fetchCategories } from "../../ReduxApi/category";
import ManageCategoriesModal from "./ManageCategoriesModal";
import {
  createProduct,
  deleteProduct,
  fetchProductData,
  productSelector,
  updateProduct,
  addStock,
} from "../../ReduxApi/product";
import { authSelector } from "../../ReduxApi/auth";
import { canRead, canWrite, canDelete, Module } from "../../utils/permissions";
import { KeyUri } from "../../shared/key";
import { RowActions, Pagination, StatCard, InfoCard, Field, DataTable, ConfirmModal } from "../../shared/ui";

const fmt = (value) => Number(value || 0).toLocaleString("en-IN");
const textValue = (value, fallback = "") =>
  typeof value === "string" ? value : value == null ? fallback : String(value);
const DESCRIPTION_WORD_LIMIT = 25;

const limitWords = (value, maxWords) => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(value || "");
  return words.slice(0, maxWords).join(" ");
};

const stockStatus = (stocks) => {
  const value = Number(stocks || 0);
  if (value <= 0) return "Out of Stock";
  if (value <= 10) return "Low Stock";
  return "In Stock";
};

const stockCountClass = (stocks) => {
  const status = stockStatus(stocks);
  if (status === "Out of Stock") return "text-red-600";
  if (status === "Low Stock") return "text-amber-600";
  return "text-emerald-700";
};

const extractId = (item) =>
  item?._id?.$oid ||
  item?._id ||
  item?.id?.$oid ||
  item?.id ||
  item?.$oid ||
  "";

const extractCategoryName = (item) =>
  textValue(item?.category_name) ||
  textValue(item?.categoryName) ||
  textValue(item?.name) ||
  textValue(item?.title) ||
  "";

const normalizeCategoryOptions = (items) =>
  items.map((item) => ({
    id: extractId(item),
    label: extractCategoryName(item) || "Unnamed Category",
  }));

const normalizeProductRow = (item, categoryMap) => {
  const categoryId = extractId(item?.category) || item?.category || "";
  const categoryLabel =
    categoryMap.get(categoryId) ||
    extractCategoryName(item?.category) ||
    textValue(item?.category_name) ||
    textValue(item?.category) ||
    "";

  return {
    id: extractId(item),
    image: item?.image || "",
    name: item?.name || "",
    description: item?.description || "",
    hsn: item?.hsn || "",
    itemCode: item?.item_code || item?.itemCode || "",
    categoryId,
    categoryLabel,
    manufacturer: item?.manufacturer || "",
    stocks: Number(item?.stocks || 0),
    soldStocks: Number(item?.sold_stocks ?? item?.soldStocks ?? 0),
    salePrice: Number(item?.sale_price ?? item?.salePrice ?? 0),
    discount: Number(item?.discount || 0),
    purchasePrice: Number(item?.purchased_price ?? item?.purchasePrice ?? 0),
    tax: Number(item?.tax || 0),
  };
};

const emptyForm = (defaultCategoryId = "") => ({
  name: "",
  description: "",
  hsn: "",
  itemCode: "",
  category: defaultCategoryId,
  manufacturer: "",
  stocks: "0",
  salePrice: "",
  discount: "",
  purchasePrice: "",
  tax: "18",
  image: "",
});

export default function Products() {
  const dispatch = useDispatch();
  const { productData, isLoading, hasLoadedOnce } = useSelector(productSelector);
  const { categoryData } = useSelector(categorySelector);
  const { user } = useSelector(authSelector);
  const hasRead = canRead(user, Module.Products);
  const hasWrite = canWrite(user, Module.Products);
  const hasDelete = canDelete(user, Module.Products);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [imageCache, setImageCache] = useState({});
  const createdImageUrls = useRef(new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [previewModal, setPreviewModal] = useState({ open: false, src: "", title: "" });
  const [stockModal, setStockModal] = useState({ open: false, productId: null, productName: "", quantity: "" });
  const [deleteModal, setDeleteModal] = useState(null);
  const [descriptionPreview, setDescriptionPreview] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(!hasLoadedOnce)

  useEffect(() => {
    if (!hasLoadedOnce) {
      Promise.all([
        dispatch(fetchProductData()),
        dispatch(fetchCategories())
      ]).then(() => setIsInitialLoad(false))
    }
  }, [dispatch]);

  const categoryOptions = useMemo(() => normalizeCategoryOptions(categoryData || []), [categoryData]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categoryOptions.forEach((item) => {
      if (item.id) map.set(item.id, item.label);
    });
    return map;
  }, [categoryOptions]);

  const products = useMemo(
    () => (Array.isArray(productData) ? productData : []).map((item) => normalizeProductRow(item, categoryMap)),
    [productData, categoryMap]
  );

  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      const filenames = [...new Set(products.map((product) => product.image).filter(Boolean))];

      await Promise.all(
        filenames.map(async (filename) => {
          try {
            const response = await axiosInstance.get(`/product-images/${filename}`, {
              responseType: "blob",
            });
            const objectUrl = URL.createObjectURL(response.data);
            createdImageUrls.current.add(objectUrl);

            if (!cancelled) {
              setImageCache((prev) => {
                if (prev[filename]) return prev;
                return { ...prev, [filename]: objectUrl };
              });
            } else {
              URL.revokeObjectURL(objectUrl);
            }
          } catch (error) {
            console.error("Failed to load product image:", filename, error);
          }
        })
      );
    };

    if (products.length) {
      loadImages();
    }

    return () => {
      cancelled = true;
    };
  }, [products]);

  const defaultCategoryId = categoryOptions[0]?.id || "";

  useEffect(() => {
    if (!form.category && defaultCategoryId) {
      setForm((prev) => ({ ...prev, category: defaultCategoryId }));
    }
  }, [defaultCategoryId, form.category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, stockFilter, taxFilter, sortBy]);

  useEffect(() => {
    if (!previewModal.open && !showModal && !stockModal.open) return;
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, [previewModal.open, showModal, stockModal.open]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = products.filter((product) => {
      const matchesSearch =
        !q ||
        [
          product.name,
          product.description,
          product.hsn,
          product.itemCode,
          product.categoryLabel,
          product.manufacturer,
        ].some((value) => String(value || "").toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === "All" ||
        product.categoryId === categoryFilter ||
        product.categoryLabel === categoryFilter;

      const status = stockStatus(product.stocks).toLowerCase();
      const matchesStock = stockFilter === "All" || status.includes(stockFilter);
      const matchesTax = taxFilter === "All" || String(product.tax) === taxFilter;

      return matchesSearch && matchesCategory && matchesStock && matchesTax;
    });

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "stock-asc") return a.stocks - b.stocks;
      if (sortBy === "stock-desc") return b.stocks - a.stocks;
      if (sortBy === "price-asc") return a.salePrice - b.salePrice;
      if (sortBy === "price-desc") return b.salePrice - a.salePrice;
      return 0;
    });

    return sorted;
  }, [products, search, categoryFilter, stockFilter, taxFilter, sortBy]);

  const summary = useMemo(() => {
    const total = filteredProducts.length;
    const out = filteredProducts.filter((product) => stockStatus(product.stocks) === "Out of Stock").length;
    const low = filteredProducts.filter((product) => stockStatus(product.stocks) === "Low Stock").length;
    const totalValue = filteredProducts.reduce((sum, product) => sum + product.salePrice * product.stocks, 0);
    return { total, out, low, totalValue };
  }, [filteredProducts]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);
  const startDisplay = filteredProducts.length === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + pageSize, filteredProducts.length);

  const openCreateModal = () => {
    setEditingProductId(null);
    setForm(emptyForm(defaultCategoryId));
    setProductImageFile(null);
    setProductImagePreview("");
    setNewCategoryName("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      hsn: product.hsn || "",
      itemCode: product.itemCode || "",
      category: product.categoryId || defaultCategoryId,
      manufacturer: product.manufacturer || "",
      stocks: product.stocks ?? "",
      salePrice: product.salePrice ?? "",
      discount: product.discount ?? "",
      purchasePrice: product.purchasePrice ?? "",
      tax: String(product.tax ?? "18"),
      image: product.image || "",
    });
    setProductImageFile(null);
    setProductImagePreview(imageCache[product.image] || "");
    setNewCategoryName("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProductId(null);
    setProductImageFile(null);
    setProductImagePreview("");
    setNewCategoryName("");
    setForm(emptyForm(defaultCategoryId));
    closePreviewModal();
  };

  const openPreviewModal = (src, title = "Image Preview") => {
    if (!src) return;
    setPreviewModal({ open: true, src, title });
  };

  const closePreviewModal = () => {
    setPreviewModal({ open: false, src: "", title: "" });
  };

  const openDescriptionPreview = (event, product) => {
    if (!product?.description) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = Math.min(360, window.innerWidth - 32);
    const popupHeight = 180;
    const spaceRight = window.innerWidth - rect.right;
    const spaceBelow = window.innerHeight - rect.top;
    const left =
      spaceRight >= popupWidth + 16
        ? rect.right + 12
        : Math.max(12, rect.left - popupWidth - 12);
    const top =
      spaceBelow >= popupHeight + 16
        ? rect.top
        : Math.max(12, window.innerHeight - popupHeight - 16);

    setDescriptionPreview({
      title: product.name || "Description",
      description: product.description,
      left,
      top,
    });
  };

  const closeDescriptionPreview = () => {
    setDescriptionPreview(null);
  };

  useEffect(() => {
    const urls = createdImageUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "description" ? limitWords(value, DESCRIPTION_WORD_LIMIT) : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setProductImageFile(file);
    setProductImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const handleAddCategory = async () => {
    const category_name = newCategoryName.trim();
    if (!category_name) return;

    const created = await dispatch(createCategory(category_name));
    const createdId = extractId(created) || extractId(created?.data) || extractId(created?.category);

    if (createdId) {
      setForm((prev) => ({ ...prev, category: createdId }));
      setNewCategoryName("");
    }
  };

  const handleSubmit = async () => {
    if (!form.category || form.category === "__add_category__") {
      toast.error("Please select or create a category before saving the product");
      return;
    }

    const payload = {
      ...form,
      imageFile: productImageFile,
      stocks: Number(form.stocks || 0),
      salePrice: Number(form.salePrice || 0),
      discount: Number(form.discount || 0),
      purchasePrice: Number(form.purchasePrice || 0),
      tax: Number(form.tax || 0),
    };

    if (editingProductId) {
      await dispatch(updateProduct(editingProductId, payload));
    } else {
      await dispatch(createProduct(payload));
    }

    closeModal();
  };

  const handleDelete = async () => {
    if (!deleteModal?.id) return;
    await dispatch(deleteProduct(deleteModal.id));
    setDeleteModal(null);
  };

  const openStockModal = (product) => {
    setStockModal({ open: true, productId: product.id, productName: product.name, quantity: "" });
  };

  const closeStockModal = () => {
    setStockModal({ open: false, productId: null, productName: "", quantity: "" });
  };

  const handleAddStock = async () => {
    const qty = Number(stockModal.quantity);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    await dispatch(addStock(stockModal.productId, qty));
    closeStockModal();
  };

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  const productImageSrc = (product) => imageCache[product.image] || "";
  const activeModalImageSrc = productImageFile
    ? productImagePreview
    : imageCache[form.image] || productImagePreview || "";

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
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-4 bg-slate-200 rounded animate-pulse mb-2 w-20"></div>
            <div className="h-8 bg-slate-200 rounded animate-pulse w-16"></div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4">
          {/* Table header */}
          <div className="grid grid-cols-11 gap-4 pb-4 border-b border-slate-200">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse"></div>
            ))}
          </div>
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-11 gap-4 py-4 border-b border-slate-100">
              {[...Array(11)].map((_, j) => (
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
    <div className=" w-full relative">
      {/* Subtle loading overlay for refreshes when data exists */}
      {isLoading && hasLoadedOnce && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
            <RefreshCcw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Refreshing products...</span>
          </div>
        </div>
      )}
      <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, HSN, manufacturer..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(fetchProductData())}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            {hasWrite && (
              <button
                type="button"
                onClick={() => setShowCategoryManager(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Categories
              </button>
            )}
            <button
              type="button"
              onClick={() => hasWrite && openCreateModal()}
              disabled={!hasWrite}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${hasWrite
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
                }`}
              title={!hasWrite ? "You don't have permission to create products" : ""}
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      </div>

      {previewModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/75 p-4" onClick={closePreviewModal}>
          <div
            className="max-w-5xl w-full rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{previewModal.title}</h3>
                {/* <p className="text-sm text-slate-500">Close the preview by clicking outside or the button below.</p> */}
              </div>
              <button
                type="button"
                onClick={closePreviewModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-4">
              <img
                src={previewModal.src}
                alt={previewModal.title}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
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
          {/* <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description Preview</p> */}
          <h4 className="mt-1 text-base font-semibold text-slate-900">{descriptionPreview.title}</h4>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-700">
            {descriptionPreview.description}
          </p>
        </div>
      )}

      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingProductId ? "Edit Item" : "Create New Item"}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingProductId ? "Update the Item and save the changes." : "Fill in the Item details to create a new item."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Item Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => activeModalImageSrc && openPreviewModal(activeModalImageSrc, form.name || "Item Image")}
                    disabled={!activeModalImageSrc}
                    className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center disabled:cursor-not-allowed"
                  >
                    {productImagePreview ? (
                      <img src={productImagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 text-sm text-slate-500">
                    <p className="truncate">
                      {productImageFile ? productImageFile.name : "Choose a Item image to preview it here."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => activeModalImageSrc && openPreviewModal(activeModalImageSrc, form.name || "Product Image")}
                        disabled={!activeModalImageSrc}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Field label="Item Name" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter item name" />
              <Field
                label={`Description`}
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder={`Enter description, up to ${DESCRIPTION_WORD_LIMIT} words`}
              />
              <Field label="HSN/CAC" name="hsn" value={form.hsn} onChange={handleFormChange} placeholder="Enter HSN" />
              <Field label="Item Code" name="itemCode" value={form.itemCode} onChange={handleFormChange} placeholder="Enter item code" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  <option value="__add_category__">+ Add new category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {form.category === "__add_category__" && (
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

              <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleFormChange} placeholder="Enter manufacturer name" />
              <div>
                <Field
                  label="Stocks"
                  name="stocks"
                  type="number"
                  value={form.stocks}
                  onChange={handleFormChange}
                  placeholder="0"
                  readOnly
                />
                <span className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Stock is managed separately using the add stock action.
                </span>
              </div>
              <Field label="Sale Price" name="salePrice" type="number" value={form.salePrice} onChange={handleFormChange} placeholder="0" />
              <Field label="Discount %" name="discount" type="number" value={form.discount} onChange={handleFormChange} placeholder="0" />
              <Field label="Procured Price (Without Tax)" name="purchasePrice" type="number" value={form.purchasePrice} onChange={handleFormChange} placeholder="0" />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tax</label>
                <select
                  name="tax"
                  value={form.tax}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {["0", "5", "12", "18", "28"].map((tax) => (
                    <option key={tax} value={tax}>
                      {tax}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !hasWrite}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingProductId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {stockModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Stock</h3>
                <p className="text-sm text-slate-500 truncate max-w-[220px]">{stockModal.productName}</p>
              </div>
              <button type="button" onClick={closeStockModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity to Add</label>
              <input
                type="number"
                min="1"
                value={stockModal.quantity}
                onChange={(e) => setStockModal((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={closeStockModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAddStock} disabled={isLoading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                Add Stock
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-2">
        <StatCard label="Total Products" value={summary.total} />
        <StatCard label="Inventory Value" value={`Rs. ${fmt(summary.totalValue)}`} valueClass="text-blue-700" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="All">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="All">All Stock</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock</option>
            <option value="in">In Stock</option>
          </select>

          <select value={taxFilter} onChange={(e) => setTaxFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="All">All Taxes</option>
            {["0", "5", "12", "18", "28"].map((tax) => (
              <option key={tax} value={tax}>
                {tax}%
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="stock-desc">Stock High-Low</option>
            <option value="stock-asc">Stock Low-High</option>
            <option value="price-desc">Sale Price High-Low</option>
            <option value="price-asc">Sale Price Low-High</option>
          </select>
        </div>
      </div>

      <DataTable
        isLoading={isLoading && !isInitialLoad}
        data={paginatedProducts}
        rowKey={(p) => p.id}
        wrapperClass="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        tbodyClass="divide-y divide-slate-200"
        emptyMessage="No products matched your filters."
        loadingMessage="Loading products..."
        columns={[
          {
            label: 'Image', stopPropagation: true,
            render: (product) => product.image ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); const src = productImageSrc(product); if (src) openPreviewModal(src, product.name || 'Product Image'); }} className="block">
                <img src={productImageSrc(product)} alt={product.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-8 w-10 rounded-lg object-cover border border-slate-200" />
              </button>
            ) : <div className="h-8 w-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">No img</div>,
          },
          {
            label: 'Name',
            render: (product) => (
              <><div className="whitespace-nowrap text-sm font-semibold text-slate-900">{product.name}</div><div className="text-xs text-slate-400">{product.manufacturer}</div></>
            ),
          },
          {
            label: 'Description',
            render: (product) => (
              <div className="text-xs text-slate-600 line-clamp-2 cursor-help max-w-[140px]" onMouseEnter={(e) => openDescriptionPreview(e, product)} onMouseLeave={closeDescriptionPreview}>{product.description || '-'}</div>
            ),
          },
          { label: 'HSN/CAC',       render: (p) => <span className="text-xs text-slate-700">{p.hsn || '-'}</span> },
          { label: 'Item Code', render: (p) => <span className="text-xs text-slate-700">{p.itemCode || '-'}</span> },
          { label: 'Category',  render: (p) => <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{textValue(p.categoryLabel, 'Unassigned') || 'Unassigned'}</span> },
          { label: 'Stock',     render: (p) => <span className={`text-xs font-semibold ${stockCountClass(p.stocks)}`}>{fmt(p.stocks) - fmt(p.soldStocks)}</span> },
          { label: 'Sold',      render: (p) => <span className="text-xs font-semibold text-slate-500">{fmt(p.soldStocks)}</span> },
          {
            label: 'In Stock',
            render: (p) => {
              const total = Number(p.stocks || 0), sold = Number(p.soldStocks || 0);
              const inStock = Math.max(total - sold, 0);
              const pct = total > 0 ? Math.round((inStock / total) * 100) : 0;
              const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';
              return (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 rounded-full bg-slate-200"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
                  <span className={`text-xs font-semibold ${pct > 50 ? 'text-emerald-600' : pct > 20 ? 'text-amber-600' : 'text-red-600'}`}>({pct}%)</span>
                </div>
              );
            },
          },
          { label: 'Sale Price', render: (p) => <span className="text-xs font-semibold text-slate-900">Rs. {fmt(p.salePrice)}</span> },
          {
            label: 'Actions', right: true, stopPropagation: true,
            render: (product) => (
              <div className="flex items-center justify-end gap-1">
                {hasWrite && (
                  <button type="button" onClick={() => openStockModal(product)} className="rounded-lg border border-emerald-300 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">+Stock</button>
                )}
                <RowActions onEdit={() => openEditModal(product)} onDelete={() => setDeleteModal({ id: product.id, name: product.name || "this item" })} canEdit={hasWrite} canDelete={hasDelete} />
              </div>
            ),
          },
        ]}
        renderExpanded={(product) => {
          const saleAfterDiscount = product.salePrice - (product.salePrice * product.discount) / 100;
          const totalAfterTax = saleAfterDiscount + (saleAfterDiscount * product.tax) / 100;
          return (
            <div className="px-4 py-4 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                <InfoCard label="Description" value={product.description || '-'} className="xl:col-span-3" valueClassName="line-clamp-2 min-h-[2.5rem]" />
                <InfoCard label="Manufacturer" value={product.manufacturer} />
                <InfoCard label="Stocks" value={fmt(product.stocks)} />
                <InfoCard label="Discount" value={`${product.discount}%`} />
                <InfoCard label="Tax" value={`${product.tax}%`} />
                <InfoCard label="Purchased Price" value={`Rs. ${fmt(product.purchasePrice)}`} />
                <InfoCard label="After Discount" value={`Rs. ${fmt(saleAfterDiscount)}`} />
                <InfoCard label="After Tax" value={`Rs. ${fmt(totalAfterTax)}`} />
                <InfoCard label="Category" value={textValue(product.categoryLabel, 'Unassigned') || 'Unassigned'} />
              </div>
            </div>
          );
        }}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredProducts.length}
        onPageChange={goToPage}
        onPageSizeChange={(n) => { setPageSize(Number(n)); setCurrentPage(1); }}
      />

      {showCategoryManager && (
        <ManageCategoriesModal onClose={() => setShowCategoryManager(false)} />
      )}

      {deleteModal && (
        <ConfirmModal
          message={<>Delete item <span className="font-medium">{deleteModal.name}</span>?</>}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}


