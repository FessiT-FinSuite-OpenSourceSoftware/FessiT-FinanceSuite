import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  data: [],
  isError: false,
}

const incomingInvoiceSlice = createSlice({
  name: 'incomingInvoice',
  initialState,
  reducers: {
    setLoading: (state) => { state.isLoading = true; state.isError = false },
    setSuccess: (state, { payload }) => { state.isLoading = false; state.data = payload },
    setFailure: (state) => { state.isLoading = false; state.isError = true },
  },
})

export const { setLoading, setSuccess, setFailure } = incomingInvoiceSlice.actions
export const incomingInvoiceSelector = (state) => state.incomingInvoice
export default incomingInvoiceSlice.reducer

export const fetchIncomingInvoices = (year, month) => async (dispatch) => {
  dispatch(setLoading())
  try {
    const params = new URLSearchParams()
    if (year)  params.set('year',  year)
    if (month) params.set('month', String(month).padStart(2, '0'))
    const qs = params.toString() ? '?' + params.toString() : ''
    const { data } = await axiosInstance.get(`/incoming-invoices${qs}`)
    dispatch(setSuccess(data))
  } catch (error) {
    dispatch(setFailure())
    toast.error(error?.response?.data?.message || 'Failed to fetch incoming invoices')
  }
}

export const createIncomingInvoice = (payload) => async (dispatch) => {
  try {
    const { data } = await axiosInstance.post('/incoming-invoices', payload)
    toast.success('Incoming invoice created successfully')
    dispatch(fetchIncomingInvoices())
    return data
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create incoming invoice')
    throw error
  }
}

export const updateIncomingInvoice = (id, payload) => async (dispatch) => {
  try {
    const { data } = await axiosInstance.put(`/incoming-invoices/${id}`, payload)
    toast.success('Incoming invoice updated successfully')
    dispatch(fetchIncomingInvoices())
    return data
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update incoming invoice')
    throw error
  }
}

export const deleteIncomingInvoice = (id) => async (dispatch) => {
  try {
    await axiosInstance.delete(`/incoming-invoices/${id}`)
    toast.success('Incoming invoice deleted successfully')
    dispatch(fetchIncomingInvoices())
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete incoming invoice')
  }
}
