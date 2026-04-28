import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  costCenters: [],
  isError: false,
  currentCostCenter: null,
}

const costCenterSlice = createSlice({
  name: 'costCenter',
  initialState,
  reducers: {
    setLoading: (state) => { state.isLoading = true; state.isError = false },
    setSuccess: (state, { payload }) => { state.isLoading = false; state.costCenters = payload },
    setOne: (state, { payload }) => { state.isLoading = false; state.currentCostCenter = payload },
    setFailure: (state) => { state.isLoading = false; state.isError = true },
    clearCurrentCostCenter: (state) => { state.currentCostCenter = null },
    setDeleteLoading: (state) => { state.isLoading = true; state.isError = false }, // Don't clear data on delete
  },
})

const { setLoading, setSuccess, setOne, setFailure, clearCurrentCostCenter, setDeleteLoading } = costCenterSlice.actions
export const costCenterSelector = (state) => state.costCenter
export { clearCurrentCostCenter }
export default costCenterSlice.reducer

export const fetchCostCenters = () => async (dispatch) => {
  dispatch(setLoading())
  try {
    const { data } = await axiosInstance.get('/cost-centers')
    dispatch(setSuccess(data))
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch cost centers')
    dispatch(setFailure())
  }
}

export const fetchOneCostCenter = (id) => async (dispatch) => {
  // Clear current cost center first to prevent showing stale data
  dispatch(clearCurrentCostCenter())
  dispatch(setLoading())
  try {
    const { data } = await axiosInstance.get(`/cost-centers/${id}`)
    dispatch(setOne(data))
  } catch (error) {
    dispatch(setFailure())
  }
}

export const createCostCenter = (payload) => async (dispatch) => {
  dispatch(setLoading())
  try {
    await axiosInstance.post('/cost-centers', payload)
    toast.success('Cost center created successfully')
    dispatch(fetchCostCenters())
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create cost center')
    dispatch(setFailure())
  }
}

export const updateCostCenter = (id, payload) => async (dispatch) => {
  dispatch(setLoading())
  try {
    await axiosInstance.put(`/cost-centers/${id}`, payload)
    toast.success('Cost center updated successfully')
    dispatch(fetchCostCenters())
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update cost center')
    dispatch(setFailure())
  }
}

export const deleteCostCenter = (id) => async (dispatch) => {
  // Don't clear the list data during delete - use setDeleteLoading instead
  try {
    await axiosInstance.delete(`/cost-centers/${id}`)
    toast.success('Cost center deleted successfully')
    dispatch(fetchCostCenters())
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete cost center')
    dispatch(setFailure())
  }
}
