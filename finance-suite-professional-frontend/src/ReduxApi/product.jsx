import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  productData: [],
  isError: false,
  currentProduct: null,
}

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    getProduct: (state) => {
      state.isLoading = true
      state.isError = false
    },

    getProductSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.productData = payload
    },

    getOneProduct: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentProduct = payload
    },

    getProductFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.productData = []
    },
  },
})

export const {
  getProduct,
  getProductSuccess,
  getProductFailure,
  getOneProduct,
} = productSlice.actions

export const productSelector = (state) => state.product
export default productSlice.reducer

const appendProductFields = (formData, productData = {}) => {
  const {
    image,
    imageFile,
    category,
    itemCode,
    item_code,
    salePrice,
    sale_price,
    purchasePrice,
    purchased_price,
    ...rest
  } = productData

  const productImage = imageFile || image
  if (productImage instanceof File || productImage instanceof Blob) {
    formData.append('image', productImage)
  }

  if (category !== undefined && category !== null) {
    formData.append('category', category)
  }

  if (itemCode !== undefined) {
    formData.append('item_code', itemCode)
  } else if (item_code !== undefined) {
    formData.append('item_code', item_code)
  }

  if (salePrice !== undefined) {
    formData.append('sale_price', salePrice)
  } else if (sale_price !== undefined) {
    formData.append('sale_price', sale_price)
  }

  if (purchasePrice !== undefined) {
    formData.append('purchased_price', purchasePrice)
  } else if (purchased_price !== undefined) {
    formData.append('purchased_price', purchased_price)
  }

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (key === 'itemCode' || key === 'salePrice' || key === 'purchasePrice') {
      return
    }

    formData.append(key, value)
  })

  return formData
}

const toProductFormData = (productData) => {
  if (productData instanceof FormData) {
    return productData
  }

  return appendProductFields(new FormData(), productData)
}

// Create Product
export const createProduct = (productData) => async (dispatch) => {
  dispatch(getProduct())

  try {
    const payload = toProductFormData(productData)
    const { data } = await axiosInstance.post('/products', payload)
    toast.success('Product created successfully')
    dispatch(fetchProductData())
    return data
  } catch (error) {
    console.error('Error creating product:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getProductFailure())
    throw error
  }
}

// Fetch All Products
export const fetchProductData = () => async (dispatch) => {
  dispatch(getProduct())

  try {
    const { data } = await axiosInstance.get('/products')
    dispatch(getProductSuccess(data))
  } catch (error) {
    console.error('Error fetching products:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getProductFailure())
  }
}

// Fetch One Product
export const fetchOneProduct = (productID) => async (dispatch) => {
  dispatch(getProduct())

  try {
    const { data } = await axiosInstance.get(`/products/${productID}?t=${Date.now()}`)
    dispatch(getOneProduct(data))
    return data
  } catch (error) {
    console.error('Error fetching product:', error)
    dispatch(getProductFailure())
    return null
  }
}

// Update Product
export const updateProduct = (productID, productData) => async (dispatch) => {
  dispatch(getProduct())

  try {
    const payload = toProductFormData(productData)
    const { data } = await axiosInstance.put(`/products/${productID}`, payload)
    toast.success('Product updated successfully')
    dispatch(fetchProductData())
    return data
  } catch (error) {
    console.error('Error updating product:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getProductFailure())
    return null
  }
}

// Delete Product
export const deleteProduct = (id) => async (dispatch) => {
  dispatch(getProduct())

  try {
    await axiosInstance.delete(`/products/${id}`)
    toast.success('Product deleted successfully')
    dispatch(fetchProductData())
  } catch (error) {
    console.error('Error deleting product:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getProductFailure())
  }
}

// Add Stock
export const addStock = (productId, quantity) => async (dispatch) => {
  dispatch(getProduct())
  try {
    const { data } = await axiosInstance.post(`/products/${productId}/add-stock`, { quantity })
    toast.success('Stock updated successfully')
    dispatch(fetchProductData())
    return data
  } catch (error) {
    console.error('Error adding stock:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getProductFailure())
    return null
  }
}
