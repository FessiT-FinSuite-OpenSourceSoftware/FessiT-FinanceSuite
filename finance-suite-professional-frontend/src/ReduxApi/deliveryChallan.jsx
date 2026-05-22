import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  data: [],
  total: 0,
  isError: false,
}

const deliveryChallanSlice = createSlice({
  name: 'deliveryChallan',
  initialState,
  reducers: {
    dcRequest: (state) => { state.isLoading = true; state.isError = false },
    dcSuccess: (state, { payload }) => {
      state.isLoading = false;
      // handle both old array response and new paginated { data, total } response
      if (Array.isArray(payload)) {
        state.data  = payload;
        state.total = payload.length;
      } else {
        state.data  = Array.isArray(payload.data) ? payload.data : [];
        state.total = payload.total || 0;
      }
    },
    dcFailure: (state) => { state.isLoading = false; state.isError = true },
  },
})

export const { dcRequest, dcSuccess, dcFailure } = deliveryChallanSlice.actions
export const deliveryChallanSelector = (state) => state.deliveryChallan
export default deliveryChallanSlice.reducer

export const fetchDeliveryChallans = ({ page = 1, pageSize = 10, search = '', status = '' } = {}) => async (dispatch) => {
  dispatch(dcRequest())
  try {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (search) params.set('search', search);
    if (status && status !== 'All') params.set('status', status);
    const { data } = await axiosInstance.get(`/delivery-challans?${params}`)
    console.log("Received Data with pagination :--->>>>>", data)
    dispatch(dcSuccess({ data: Array.isArray(data.data) ? data.data : [], total: data.total || 0 }))
  } catch (err) {
    dispatch(dcFailure())
    toast.error(err?.response?.data?.message || 'Failed to fetch delivery challans')
  }
}

const toFormData = (payload, files = {}) => {
  const fd = new FormData()
  const { items, ...rest } = payload
  Object.entries(rest).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)) })
  fd.append('items', JSON.stringify(items || []))
  if (files.dispatched_copy)   fd.append('dispatched_copy',   files.dispatched_copy)
  if (files.acknowledged_copy) fd.append('acknowledged_copy', files.acknowledged_copy)
  return fd
}

export const createDeliveryChallan = (payload, files = {}) => async (dispatch) => {
  dispatch(dcRequest())
  try {
    const { data } = await axiosInstance.post('/delivery-challans', toFormData(payload, files))
    toast.success('Delivery challan created')
    dispatch(dcFailure())
    return data
  } catch (err) {
    dispatch(dcFailure())
    toast.error(err?.response?.data?.message || 'Failed to create delivery challan')
    throw err
  }
}

export const updateDeliveryChallan = (id, payload, files = {}) => async (dispatch) => {
  dispatch(dcRequest())
  try {
    const { data } = await axiosInstance.put(`/delivery-challans/${id}`, toFormData(payload, files))
    toast.success('Delivery challan updated')
    dispatch(dcFailure())
    return data
  } catch (err) {
    dispatch(dcFailure())
    toast.error(err?.response?.data?.message || 'Failed to update delivery challan')
    throw err
  }
}

export const deleteDeliveryChallan = (id) => async (dispatch) => {
  dispatch(dcRequest())
  try {
    await axiosInstance.delete(`/delivery-challans/${id}`)
    toast.success('Delivery challan deleted')
    dispatch(fetchDeliveryChallans())
  } catch (err) {
    dispatch(dcFailure())
    toast.error(err?.response?.data?.message || 'Failed to delete delivery challan')
  }
}

export const fetchNextChallanNo = () => async () => {
  try {
    const { data } = await axiosInstance.get('/delivery-challans/next-number')
    return data.challan_no
  } catch {
    return null
  }
}
