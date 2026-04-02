import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  salaryData: [],
  isError: false,
};

const salarySlice = createSlice({
  name: 'salary',
  initialState,
  reducers: {
    salaryRequest: (state) => { state.isLoading = true; state.isError = false; },
    salarySuccess: (state, { payload }) => { state.isLoading = false; state.salaryData = payload; },
    salaryFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { salaryRequest, salarySuccess, salaryFailure } = salarySlice.actions;
export const salarySelector = (state) => state.salary;
export default salarySlice.reducer;

export const fetchSalaries = () => async (dispatch) => {
  dispatch(salaryRequest());
  try {
    const { data } = await axiosInstance.get('/salaries');
    dispatch(salarySuccess(data));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch salaries');
    dispatch(salaryFailure());
  }
};

export const createSalary = (payload) => async (dispatch) => {
  dispatch(salaryRequest());
  try {
    const { data } = await axiosInstance.post('/salaries', payload);
    toast.success(data.message || 'Salary record created');
    dispatch(fetchSalaries());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create salary record');
    dispatch(salaryFailure());
  }
};

export const updateSalary = (id, payload) => async (dispatch) => {
  dispatch(salaryRequest());
  try {
    const { data } = await axiosInstance.put(`/salaries/${id}`, payload);
    toast.success(data.message || 'Salary record updated');
    dispatch(fetchSalaries());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update salary record');
    dispatch(salaryFailure());
  }
};

export const deleteSalary = (id) => async (dispatch) => {
  dispatch(salaryRequest());
  try {
    const { data } = await axiosInstance.delete(`/salaries/${id}`);
    toast.success(data.message || 'Salary record deleted');
    dispatch(fetchSalaries());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete salary record');
    dispatch(salaryFailure());
  }
};
