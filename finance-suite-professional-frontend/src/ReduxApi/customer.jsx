import { createSlice } from '@reduxjs/toolkit'
import { getConfig, KeyUri } from '../shared/key'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  customersData: [],
  isError: false,
  currentCustomer: null,
  customerProjects: [],
}

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    getCustomer: (state) => {
      state.isLoading = true
      state.isError = false
    },
    getCustomerSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.customersData = payload
    },
    getOneCustomer: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentCustomer = payload
    },
    setCustomerProjects: (state, { payload }) => {
      state.customerProjects = payload
    },
    getCustomerFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.customersData = []
    },
  },
})

export const {
  getCustomer,
  getCustomerFailure,
  getCustomerSuccess,
  getOneCustomer,
  setCustomerProjects,
} = customerSlice.actions

export const customerSelector = (state) => state.customer
export default customerSlice.reducer

// ✅ Create customer
export const createCustomer = (customerData) => async (dispatch) => {
  dispatch(getCustomer())
  try {
    const { data } = await axiosInstance.post('/customers', customerData)
    toast.success(data.message)
    dispatch(fetchCustomerData())
  } catch (error) {
    console.error('Error creating customer:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getCustomerFailure())
  }
}

// ✅ Fetch all customers
export const fetchCustomerData = () => async (dispatch) => {
  dispatch(getCustomer())
  try {
    const { data } = await axiosInstance.get('/customers')
    dispatch(getCustomerSuccess(data))
  } catch (error) {
    console.error('Error fetching customers:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getCustomerFailure())
  }
}

// ✅ Fetch one customer
export const fetchOneCustomer = (customerID) => async (dispatch) => {
  dispatch(getCustomer())
  try {
    const { data } = await axiosInstance.get(`/customers/${customerID}`)
    dispatch(getOneCustomer(data))
  } catch (error) {
    console.error('Error fetching customer:', error)
    dispatch(getCustomerFailure())
  }
}

// ✅ Update customer (note the plural route fixed)
export const updateCustomerData =
  (customerID, customerData) => async (dispatch) => {
    dispatch(getCustomer())
    try {
      const { data } = await axiosInstance.put(
        `/customer/${customerID}`,
        customerData
      )
      toast.success(data.message)
      dispatch(fetchCustomerData())
    } catch (error) {
      console.error('Error updating customer:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getCustomerFailure())
    }
  }

// ✅ Delete customer
export const deleteCustomer = (id) => async (dispatch) => {
  dispatch(getCustomer())
  try {
    const { data } = await axiosInstance.delete(`/customer/${id}`)
    toast.success(data.message)
    dispatch(fetchCustomerData())
  } catch (error) {
    console.error('Error deleting customer:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getCustomerFailure())
  }
}

// ✅ Fetch projects for a specific customer
export const fetchCustomerProjects = (customerId) => async (dispatch) => {
  try {
    const { data } = await axiosInstance.get(`/customers/${customerId}/projects`)
    dispatch(setCustomerProjects(data))
  } catch (error) {
    console.error('Error fetching customer projects:', error)
    dispatch(setCustomerProjects([]))
  }
}
