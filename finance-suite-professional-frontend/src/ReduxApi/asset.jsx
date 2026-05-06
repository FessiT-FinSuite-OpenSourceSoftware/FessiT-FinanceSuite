import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  assetData: [],
  isError: false,
  currentAsset: null,
  hasLoadedOnce: false,
}

const assetSlice = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    getAsset: (state) => { state.isLoading = true; state.isError = false },
    getAssetSuccess: (state, { payload }) => { 
      state.isLoading = false; 
      state.assetData = payload; 
      state.hasLoadedOnce = true;
    },
    getOneAsset: (state, { payload }) => { state.isLoading = false; state.currentAsset = payload },
    getAssetFailure: (state) => { state.isLoading = false; state.isError = true },
  },
})

export const { getAsset, getAssetSuccess, getAssetFailure, getOneAsset } = assetSlice.actions
export const assetSelector = (state) => state.asset
export default assetSlice.reducer

const toFormData = (d) => {
  const fd = new FormData()

  if (d.imageFile instanceof File) fd.append('image', d.imageFile)

  fd.append('name', d.name || '')
  fd.append('description', d.description || '')
  fd.append('hsn', d.hsn || '')
  fd.append('item_code', d.item_code || '')
  fd.append('category', d.category || '')
  fd.append('manufacturer', d.manufacturer || '')
  fd.append('vendor', d.vendor || '')
  fd.append('payment_mode', d.payment_mode || 'bank_transfer')
  fd.append('stocks', String(Number(d.stocks ?? 0)))
  fd.append('warranty_period', d.warranty_period || '')
  fd.append('asset_status', d.asset_status || 'active')
  fd.append('sale_price', String(Number(d.sale_price ?? 0)))
  fd.append('purchased_price', String(Number(d.purchased_price ?? 0)))
  fd.append('tax', String(Number(d.tax ?? 0)))
  fd.append('purchased_date', d.purchased_date || '')
  fd.append('notes', d.notes || '')
  fd.append('assigned_date', d.assigned_date || '')
  fd.append('assigned_to', d.assigned_to || '')
  fd.append('serial_no', d.serial_no || '')
  fd.append('asset_type', d.asset_type || 'owned')
  return fd
}

export const fetchAssetData = () => async (dispatch) => {
  dispatch(getAsset())
  try {
    const { data } = await axiosInstance.get('/assets')
    dispatch(getAssetSuccess(data))
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch assets')
    dispatch(getAssetFailure())
  }
}

export const fetchOneAsset = (assetID) => async (dispatch) => {
  dispatch(getAsset())
  try {
    const { data } = await axiosInstance.get(`/assets/${assetID}`)
    dispatch(getOneAsset(data))
    return data
  } catch (error) {
    dispatch(getAssetFailure())
    return null
  }
}

export const createAsset = (assetData) => async (dispatch) => {
  dispatch(getAsset())
  try {
    const { data } = await axiosInstance.post('/assets', toFormData(assetData))
    toast.success('Asset created successfully')
    dispatch(fetchAssetData())
    return data
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create asset')
    dispatch(getAssetFailure())
    throw error
  }
}

export const updateAsset = (assetID, assetData) => async (dispatch) => {
  dispatch(getAsset())
  try {
    const { data } = await axiosInstance.put(`/assets/${assetID}`, toFormData(assetData))
    toast.success('Asset updated successfully')
    dispatch(fetchAssetData())
    return data
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update asset')
    dispatch(getAssetFailure())
    return null
  }
}

export const deleteAsset = (id) => async (dispatch) => {
  dispatch(getAsset())
  try {
    await axiosInstance.delete(`/assets/${id}`)
    toast.success('Asset deleted successfully')
    dispatch(fetchAssetData())
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete asset')
    dispatch(getAssetFailure())
  }
}

export const updateAssetStatus = (assetId, assetStatus) => async (dispatch) => {
  dispatch(getAsset())
  try {
    const { data } = await axiosInstance.put(`/assets/${assetId}/status`, { asset_status: assetStatus })
    toast.success('Asset status updated successfully')
    dispatch(fetchAssetData())
    return data
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update asset status')
    dispatch(getAssetFailure())
    return null
  }
}
