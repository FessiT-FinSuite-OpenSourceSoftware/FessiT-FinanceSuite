import { createSlice } from '@reduxjs/toolkit'
import { config, KeyUri } from '../shared/key'
import axios from 'axios'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  customersData: [],
  isError: false,
  currentCustomer: null,
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
} = customerSlice.actions

export const customerSelector = (state) => state.customer
export default customerSlice.reducer

// ✅ Create customer
export const createCustomer = (customerData) => async (dispatch) => {
  dispatch(getCustomer())
  try {
    const { data } = await axios.post(
      `${KeyUri.BACKENDURI}/customers`,
      customerData,
      config
    )
<<<<<<< HEAD
    console.log('Customer created:', data)
    toast.success(data.message || 'Customer created successfully')
=======
    // console.log('Customer created:', data)
    toast.success(data.message)
    // console.log(data.message)
>>>>>>> Phoenix-Reborn
    dispatch(fetchCustomerData()) // Refresh list after creation
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
    const { data } = await axios.get(`${KeyUri.BACKENDURI}/customers`, config)
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
    const { data } = await axios.get(
      `${KeyUri.BACKENDURI}/customers/${customerID}`,
      config
    )
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
      const { data } = await axios.put(
<<<<<<< HEAD
        `${KeyUri.BACKENDURI}/customers/${customerID}`,
        customerData,
        config
      )
      toast.success(data.message || 'Customer updated successfully')
=======
        `${KeyUri.BACKENDURI}/customer/${customerID}`,
        customerData,
        config
      )
      toast.success(data.message)
>>>>>>> Phoenix-Reborn
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
    const { data } = await axios.delete(
<<<<<<< HEAD
      `${KeyUri.BACKENDURI}/customers/${id}`,
      config
    )
    toast.success(data.message || 'Customer deleted successfully')
=======
      `${KeyUri.BACKENDURI}/customer/${id}`,
      config
    )
    // console.log(data)
    toast.success(data.message)
>>>>>>> Phoenix-Reborn
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
