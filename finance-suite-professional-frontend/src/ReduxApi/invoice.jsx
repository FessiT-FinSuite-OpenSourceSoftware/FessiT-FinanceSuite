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
    console.log("the data that we are dealing with is ", invoiceData);
    // Build create payload: normalize and map serviceId -> service_type_id
    const payload = normalizeMongoValue(invoiceData || {});
    if (payload.serviceId && !payload.service_type_id) {
      payload.service_type_id = payload.serviceId;
    }
    // Remove UI-only fields and Mongo-owned fields
    delete payload._id;
    delete payload.id;
    delete payload.linkedLogo;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.service;
    delete payload.serviceId;

    const { data } = await axiosInstance.post('/invoices', payload)
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
    console.log("this is what ive received from backend after getting estimiate request")
    return data.invoice_number
  } catch (error) {
    console.error('Error fetching next invoice number:', error)
    // Return fallback number if API fails
    const fallbackNumber = 'INV-001'
    dispatch(setNextInvoiceNumber(fallbackNumber))
    return fallbackNumber
  }
}


// Fetch All Invoices (optionally filtered by year+month or full financial year)
export const fetchInvoiceData = (year, month) => async (dispatch) => {
  dispatch(getInvoice())
  try {
    const params = new URLSearchParams()
    if (year && month === "fy") {
      // Indian FY: April 1 of `year` to March 31 of `year+1`
      params.set('start_date', `${year}-04-01`)
      params.set('end_date',   `${year + 1}-03-31`)
    } else {
      if (year)  params.set('year',  year)
      if (month) params.set('month', String(month).padStart(2, '0'))
    }
    const qs = params.toString() ? '?' + params.toString() : ''
    const { data } = await axiosInstance.get(`/invoices${qs}`)
    // Normalize incoming list items: convert Mongo object shapes and ensure serviceId is present
    const normalizedList = Array.isArray(data)
      ? data.map((item) => {
          const n = normalizeMongoValue(item || {});
          n.serviceId = n.serviceId || n.service || n.service_type_id || n.service_type_id;
          n.service = n.service || n.serviceId || n.service_type_id || n.service_type_id;
          return n;
        })
      : [];
    dispatch(getInvoiceSuccess(normalizedList))
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
    // Normalize incoming invoice object so UI gets `serviceId` consistently
    const normalized = normalizeMongoValue(data || {});
    normalized.serviceId = normalized.serviceId || normalized.service || normalized.service_type_id || normalized.service_type_id;
    normalized.service = normalized.service || normalized.serviceId || normalized.service_type_id || normalized.service_type_id;
    dispatch(getOneInvoice(normalized))
    return normalized
  } catch (error) {
    console.error('Error fetching invoice:', error)
    dispatch(getInvoiceFailure())
    return null
  }
}

const normalizeMongoValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeMongoValue)
  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid
    if (typeof value.$date === 'string') return value.$date
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeMongoValue(val)])
    )
  }
  return value
}

const buildInvoiceUpdatePayload = (invoiceData) => {
  const payload = normalizeMongoValue(invoiceData || {})

  if (payload.serviceId && !payload.service_type_id) {
    payload.service_type_id = payload.serviceId
  }

  // Mongo/API-owned fields should not be sent back in an update body.
  delete payload._id
  delete payload.id
  delete payload.linkedLogo
  delete payload.created_at
  delete payload.updated_at

  // The edit form keeps `service` as UI display state; the API uses serviceId/service_type_id.
  delete payload.service
  delete payload.serviceId

  return payload
}


// Update Invoice
export const updateInvoice =
  (invoiceID, invoiceData) => async (dispatch) => {
    dispatch(getInvoice())

    try {
      const payload = buildInvoiceUpdatePayload(invoiceData)
      const { data } = await axiosInstance.put(
        `/invoices/${invoiceID}`,
        payload
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
