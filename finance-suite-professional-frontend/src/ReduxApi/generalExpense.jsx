import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  generalExpenseData: [],
  isError: false,
};

const generalExpenseSlice = createSlice({
  name: 'generalExpense',
  initialState,
  reducers: {
    generalExpenseRequest: (state) => { state.isLoading = true; state.isError = false; },
    generalExpenseSuccess: (state, { payload }) => { state.isLoading = false; state.generalExpenseData = payload; },
    generalExpenseFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { generalExpenseRequest, generalExpenseSuccess, generalExpenseFailure } = generalExpenseSlice.actions;
export const generalExpenseSelector = (state) => state.generalExpense;
export default generalExpenseSlice.reducer;

export const fetchGeneralExpenses = () => async (dispatch) => {
  dispatch(generalExpenseRequest());
  try {
    const { data } = await axiosInstance.get('/general-expenses');
    dispatch(generalExpenseSuccess(data));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch general expenses');
    dispatch(generalExpenseFailure());
  }
};

export const createGeneralExpense = (payload) => async (dispatch) => {
  dispatch(generalExpenseRequest());
  try {
    await axiosInstance.post('/general-expenses', payload);
    toast.success('Expense created successfully');
    dispatch(fetchGeneralExpenses());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create expense');
    dispatch(generalExpenseFailure());
  }
};

export const updateGeneralExpense = (id, payload) => async (dispatch) => {
  dispatch(generalExpenseRequest());
  try {
    await axiosInstance.put(`/general-expenses/${id}`, payload);
    toast.success('Expense updated successfully');
    dispatch(fetchGeneralExpenses());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update expense');
    dispatch(generalExpenseFailure());
  }
};

export const deleteGeneralExpense = (id) => async (dispatch) => {
  dispatch(generalExpenseRequest());
  try {
    await axiosInstance.delete(`/general-expenses/${id}`);
    toast.success('Expense deleted successfully');
    dispatch(fetchGeneralExpenses());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete expense');
    dispatch(generalExpenseFailure());
  }
};

export const uploadGeneralExpenseFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await axiosInstance.post('/general-expense-files', fd);
  return data.filename;
};
