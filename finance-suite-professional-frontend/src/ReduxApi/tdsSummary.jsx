import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  isError: false,
  data: null,
  // data shape from GET /incoming-invoices/tds-summary:
  // {
  //   month: "2025-07",
  //   incoming_invoices: { invoice_count, total_tds_deducted, tds_on_paid, tds_pending },
  //   salaries:          { salary_count,  total_tds_deducted, tds_on_paid, tds_pending },
  //   combined:          { total_tds_deducted, tds_on_paid, tds_pending }
  // }
};

const tdsSummarySlice = createSlice({
  name: 'tdsSummary',
  initialState,
  reducers: {
    tdsSummaryRequest: (state) => { state.isLoading = true; state.isError = false; },
    tdsSummarySuccess: (state, { payload }) => { state.isLoading = false; state.data = payload; },
    tdsSummaryFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { tdsSummaryRequest, tdsSummarySuccess, tdsSummaryFailure } = tdsSummarySlice.actions;
export const tdsSummarySelector = (state) => state.tdsSummary;
export default tdsSummarySlice.reducer;

export const fetchTdsSummary = () => async (dispatch) => {
  dispatch(tdsSummaryRequest());
  try {
    const { data } = await axiosInstance.get('/incoming-invoices/tds-summary');
    dispatch(tdsSummarySuccess(data));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch TDS summary');
    dispatch(tdsSummaryFailure());
  }
};
