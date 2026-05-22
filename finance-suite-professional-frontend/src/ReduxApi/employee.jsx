import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  isFetching: false,
  data: [],
  total: 0,
  page: 1,
  pageSize: 10,
  isError: false,
};

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    employeeRequest: (state) => { state.isFetching = true; state.isError = false; },
    setLoading: (state) => { state.isLoading = true; state.isFetching = true; state.isError = false; },
    employeePageSuccess: (state, { payload }) => {
      state.isFetching = false;
      state.isLoading  = false;
      state.data       = payload.data;
      state.total      = payload.total;
      state.page       = payload.page;
      state.pageSize   = payload.page_size;
    },
    employeeFailure: (state) => { state.isFetching = false; state.isLoading = false; state.isError = true; },
  },
});

export const { employeeRequest, setLoading, employeePageSuccess, employeeFailure } = employeeSlice.actions;
export const employeeSelector = (state) => state.employee;
export default employeeSlice.reducer;

export const fetchEmployees = ({ page = 1, pageSize = 10, search = '', department = '', employeeType = '', status = '' } = {}) => async (dispatch, getState) => {
  const hasData = getState().employee.data.length > 0;
  if (!hasData) dispatch(employeeSlice.actions.setLoading());
  else dispatch(employeeRequest());
  try {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (search.trim()) params.set('search', search.trim());
    if (department && department !== 'All') params.set('department', department);
    if (employeeType && employeeType !== 'All') params.set('employee_type', employeeType);
    if (status && status !== 'All') params.set('status', status);
    const { data } = await axiosInstance.get(`/employees?${params}`);
    dispatch(employeePageSuccess(data));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch employees');
    dispatch(employeeFailure());
  }
};

/** Returns a flat array of { id, name, emp_id } for the reporting manager dropdown. */
export const fetchAllEmployees = () => async () => {
  try {
    const { data } = await axiosInstance.get('/employees/all');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const toFormData = (payload, photoFile) => {
  const fd = new FormData();
  const skip = new Set(['photo', 'reporting_manager_name', 'id', '_id']);
  Object.entries(payload).forEach(([k, v]) => {
    if (skip.has(k) || v == null) return;
    fd.append(k, String(v));
  });
  if (photoFile instanceof File) fd.append('photo', photoFile);
  return fd;
};

export const createEmployee = (payload, photoFile, paginationOpts) => async (dispatch) => {
  dispatch(employeeRequest());
  try {
    await axiosInstance.post('/employees', toFormData(payload, photoFile));
    toast.success('Employee created successfully');
    dispatch(fetchEmployees(paginationOpts));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to create employee');
    dispatch(employeeFailure());
  }
};

export const updateEmployee = (id, payload, photoFile, paginationOpts) => async (dispatch) => {
  dispatch(employeeRequest());
  try {
    await axiosInstance.put(`/employees/${id}`, toFormData(payload, photoFile));
    toast.success('Employee updated successfully');
    dispatch(fetchEmployees(paginationOpts));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to update employee');
    dispatch(employeeFailure());
  }
};

export const deleteEmployee = (id, paginationOpts) => async (dispatch) => {
  dispatch(employeeRequest());
  try {
    await axiosInstance.delete(`/employees/${id}`);
    toast.success('Employee deleted successfully');
    dispatch(fetchEmployees(paginationOpts));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to delete employee');
    dispatch(employeeFailure());
  }
};
