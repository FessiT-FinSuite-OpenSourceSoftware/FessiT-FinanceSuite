import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  purchaseOrderData: [],
  isError: false,
  currentPurchaseOrder: null,
  nextPONumber: null,
}

const purchaseOrderSlice = createSlice({
  name: 'purchaseOrder',
  initialState,
  reducers: {
    getPurchaseOrder: (state) => {
      state.isLoading = true
      state.isError = false
    },

    getPurchaseOrderSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.purchaseOrderData = payload
    },

    getOnePurchaseOrder: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentPurchaseOrder = payload
    },

    setNextPONumber: (state, { payload }) => {
      state.nextPONumber = payload
    },

    getPurchaseOrderFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.purchaseOrderData = []
    },
  },
})

export const {
  getPurchaseOrder,
  getPurchaseOrderSuccess,
  getPurchaseOrderFailure,
  getOnePurchaseOrder,
  setNextPONumber,
} = purchaseOrderSlice.actions

export const purchaseOrderSelector = (state) => state.purchaseOrder
export default purchaseOrderSlice.reducer

export const createPurchaseOrder = (poData) => async (dispatch) => {
  dispatch(getPurchaseOrder())

  try {
    const { data } = await axiosInstance.post(`/purchase-orders?org_email=${localStorage.getItem('email')}`, poData)
    toast.success('Purchase Order created successfully')
    dispatch(fetchPurchaseOrderData())
    return data
  } catch (error) {
    console.error('Error creating purchase order:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getPurchaseOrderFailure())
    throw error
  }
}

// Fetch Next PO Number
export const fetchNextPONumber = () => async (dispatch) => {
  try {
    const { data } = await axiosInstance.get(`/purchase-orders/next-number?org_email=${localStorage.getItem('email')}`)
    dispatch(setNextPONumber(data.po_number))
    return data.po_number
  } catch (error) {
    console.error('Error fetching next PO number:', error)
    // Return fallback number if API fails
    const fallbackNumber = 'PO-001'
    dispatch(setNextPONumber(fallbackNumber))
    return fallbackNumber
  }
}

export const fetchPurchaseOrderData = () => async (dispatch) => {
  dispatch(getPurchaseOrder())

  try {
    const { data } = await axiosInstance.get(`/purchase-orders?org_email=${localStorage.getItem('email')}`)
    dispatch(getPurchaseOrderSuccess(data))
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getPurchaseOrderFailure())
  }
}

export const fetchOnePurchaseOrder = (poID) => async (dispatch) => {
  dispatch(getPurchaseOrder())

  try {
    const { data } = await axiosInstance.get(`/purchase-orders/${poID}?t=${Date.now()}`)
    dispatch(getOnePurchaseOrder(data))
  } catch (error) {
    console.error('Error fetching purchase order:', error)
    dispatch(getPurchaseOrderFailure())
  }
}

export const updatePurchaseOrder =
  (poID, poData) => async (dispatch) => {
    dispatch(getPurchaseOrder())

    try {
      const { data } = await axiosInstance.put(`/purchase-orders/${poID}`, poData)
      toast.success(data.message)
      dispatch(fetchPurchaseOrderData())
    } catch (error) {
      console.error('Error updating purchase order:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getPurchaseOrderFailure())
    }
  }

export const deletePurchaseOrder = (id) => async (dispatch) => {
  dispatch(getPurchaseOrder())

  try {
    const { data } = await axiosInstance.delete(`/purchase-orders/${id}`)
    toast.success(data.message)
    dispatch(fetchPurchaseOrderData())
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getPurchaseOrderFailure())
  }
}
