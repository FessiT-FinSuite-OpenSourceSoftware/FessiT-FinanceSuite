import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  isError: false,
  data: null,
};

const ptSummarySlice = createSlice({
  name: 'ptSummary',
  initialState,
  reducers: {
    ptSummaryRequest: (state) => { state.isLoading = true; state.isError = false; },
    ptSummarySuccess: (state, { payload }) => { state.isLoading = false; state.data = payload; },
    ptSummaryFailure: (state) => { state.isLoading = false; state.isError = true; },
    ptSummaryClear:   (state) => { state.data = null; state.isLoading = false; },
  },
});

export const { ptSummaryRequest, ptSummarySuccess, ptSummaryFailure, ptSummaryClear } = ptSummarySlice.actions;
export const ptSummarySelector = (state) => state.ptSummary;
export default ptSummarySlice.reducer;

export const fetchPtSummary = (selectedMonths) => async (dispatch) => {
  dispatch(ptSummaryRequest());
  try {
    const months = Array.isArray(selectedMonths) ? selectedMonths : [selectedMonths];
    const results = await Promise.all(
      months.map(({ year, month }) => {
        const params = new URLSearchParams();
        params.set('year', year);
        params.set('month', String(month).padStart(2, '0'));
        return axiosInstance.get(`/salaries/pt-summary?${params.toString()}`).then((r) => r.data);
      })
    );
    const combined = results.reduce(
      (acc, r) => ({
        month: r.month,
        salary_count:       (acc.salary_count       || 0) + (r.salary_count       || 0),
        total_pt_deducted:  (acc.total_pt_deducted  || 0) + (r.total_pt_deducted  || 0),
      }),
      {}
    );
    dispatch(ptSummarySuccess(combined));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch PT summary');
    dispatch(ptSummaryFailure());
  }
};
