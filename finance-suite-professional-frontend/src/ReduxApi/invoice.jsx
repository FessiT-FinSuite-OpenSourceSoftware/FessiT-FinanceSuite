import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  invoiceData: [],
  isError: false,
  currentInvoice: null,
  nextInvoiceNumber: null,
}

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    getInvoice: (state) => {
      state.isLoading = true
      state.isError = false
    },

    getInvoiceSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.invoiceData = payload
    },

    getOneInvoice: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentInvoice = payload
    },

    setNextInvoiceNumber: (state, { payload }) => {
      state.nextInvoiceNumber = payload
    },

    getInvoiceFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.invoiceData = []
    },
  },
})

export const {
  getInvoice,
  getInvoiceSuccess,
  getInvoiceFailure,
  getOneInvoice,
  setNextInvoiceNumber,
} = invoiceSlice.actions

export const invoiceSelector = (state) => state.invoice
export default invoiceSlice.reducer


// Create Invoice
export const createInvoice = (invoiceData) => async (dispatch) => {
  dispatch(getInvoice())

  try {
    const { data } = await axiosInstance.post('/invoices', invoiceData)
    toast.success('Invoice created successfully')
    dispatch(fetchInvoiceData())
    return data
  } catch (error) {
    console.error('Error creating invoice:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getInvoiceFailure())
    throw error
  }
}

// Fetch Next Invoice Number
export const fetchNextInvoiceNumber = () => async (dispatch) => {
  try {
    const { data } = await axiosInstance.get('/invoices/next-number')
    dispatch(setNextInvoiceNumber(data.invoice_number))
    return data.invoice_number
  } catch (error) {
    console.error('Error fetching next invoice number:', error)
    // Return fallback number if API fails
    const fallbackNumber = 'INV-001'
    dispatch(setNextInvoiceNumber(fallbackNumber))
    return fallbackNumber
  }
}


// Fetch All Invoices
export const fetchInvoiceData = () => async (dispatch) => {
  dispatch(getInvoice())

  try {
    const { data } = await axiosInstance.get('/invoices')
    dispatch(getInvoiceSuccess(data))
  } catch (error) {
    console.error('Error fetching invoices:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getInvoiceFailure())
  }
}


// Fetch One Invoice
export const fetchOneInvoice = (invoiceID) => async (dispatch) => {
  dispatch(getInvoice())

  try {
    const { data } = await axiosInstance.get(`/invoices/${invoiceID}?t=${Date.now()}`)
    dispatch(getOneInvoice(data))
    return data
  } catch (error) {
    console.error('Error fetching invoice:', error)
    dispatch(getInvoiceFailure())
    return null
  }
}


// Update Invoice
export const updateInvoice =
  (invoiceID, invoiceData) => async (dispatch) => {
    dispatch(getInvoice())

    try {
      const { data } = await axiosInstance.put(
        `/invoices/${invoiceID}`,
        invoiceData
      )
      toast.success('Invoice updated successfully')
      dispatch(fetchInvoiceData())
      return data
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getInvoiceFailure())
      return null
    }
  }


// Delete Invoice
export const deleteInvoice = (id) => async (dispatch) => {
  dispatch(getInvoice())

  try {
    const { data } = await axiosInstance.delete(`/invoices/${id}`)
    toast.success('Invoice deleted successfully')
    dispatch(fetchInvoiceData())
  } catch (error) {
    console.error('Error deleting invoice:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getInvoiceFailure())
  }
}
