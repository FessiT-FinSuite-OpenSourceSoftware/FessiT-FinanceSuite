import { createSlice } from '@reduxjs/toolkit'
import { getConfig, KeyUri } from '../shared/key'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  expenseData: [],
  isError: false,
  currentExpense: null,
}

const expenseSlice = createSlice({
  name: 'expense',
  initialState,
  reducers: {
    getExpense: (state) => {
      state.isLoading = true
      state.isError = false
    },

    getExpenseSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.expenseData = payload
    },

    getOneExpense: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentExpense = payload
    },

    getExpenseFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.expenseData = []
    },
  },
})

export const {
  getExpense,
  getExpenseSuccess,
  getExpenseFailure,
  getOneExpense,
} = expenseSlice.actions

export const expenseSelector = (state) => state.expense
export default expenseSlice.reducer


// Create Expense
export const createExpense = (expenseData) => async (dispatch) => {
  dispatch(getExpense())
  try {
    const { data } = await axiosInstance.post('/expenses', expenseData)
    toast.success('Expense created successfully')
    dispatch(fetchExpenseData())
  } catch (error) {
    console.error('Error creating expense:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getExpenseFailure())
    throw error
  }
}


// Fetch All Expenses
export const fetchExpenseData = () => async (dispatch) => {
  dispatch(getExpense())
  try {
    const { data } = await axiosInstance.get('/expenses')
    dispatch(getExpenseSuccess(data?.expenses))
  } catch (error) {
    console.error('Error fetching expenses:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getExpenseFailure())
  }
}


// Fetch One Expense
export const fetchOneExpense = (expenseID) => async (dispatch) => {
  dispatch(getExpense())
  try {
    const { data } = await axiosInstance.get(`/expenses/${expenseID}`)
    dispatch(getOneExpense(data))
    return data
  } catch (error) {
    console.error('Error fetching expense:', error)
    dispatch(getExpenseFailure())
    return null
  }
}


// Update Expense
export const updateExpense =
  (expenseID, expenseData) => async (dispatch) => {
    dispatch(getExpense())
    try {
      const { data } = await axiosInstance.put(`/expenses/${expenseID}`, expenseData)
      toast.success("Expense Updated Successfully")
      dispatch(fetchExpenseData())
      return data
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getExpenseFailure())
      return null
    }
  }


// Delete Expense
export const deleteExpense = (id) => async (dispatch) => {
  dispatch(getExpense())
  try {
    const { data } = await axiosInstance.delete(`/expenses/${id}`)
    toast.success(data.message || "Expense Deleted Successfully")
    dispatch(fetchExpenseData())
  } catch (error) {
    console.error('Error deleting expense:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getExpenseFailure())
  }
}
