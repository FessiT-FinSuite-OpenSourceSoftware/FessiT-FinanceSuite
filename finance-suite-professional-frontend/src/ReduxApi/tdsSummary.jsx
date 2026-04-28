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

export const fetchTdsSummary = (selectedMonths) => async (dispatch) => {
  dispatch(tdsSummaryRequest());
  try {
    const months = Array.isArray(selectedMonths) ? selectedMonths : [selectedMonths];
    const results = await Promise.all(
      months.map(({ year, month }) => {
        const params = new URLSearchParams();
        params.set('year', year);
        params.set('month', String(month).padStart(2, '0'));
        return axiosInstance.get(`/incoming-invoices/tds-summary?${params.toString()}`)
          .then(r => r.data);
      })
    );
    // Aggregate all months into a single combined result
    const combined = results.reduce((acc, r) => ({
      month: r.month,
      incoming_invoices: {
        invoice_count:      (acc.incoming_invoices?.invoice_count      || 0) + (r.incoming_invoices?.invoice_count      || 0),
        total_tds_deducted: (acc.incoming_invoices?.total_tds_deducted || 0) + (r.incoming_invoices?.total_tds_deducted || 0),
        tds_on_paid:        (acc.incoming_invoices?.tds_on_paid        || 0) + (r.incoming_invoices?.tds_on_paid        || 0),
        tds_pending:        (acc.incoming_invoices?.tds_pending        || 0) + (r.incoming_invoices?.tds_pending        || 0),
      },
      salaries: {
        salary_count:       (acc.salaries?.salary_count       || 0) + (r.salaries?.salary_count       || 0),
        total_tds_deducted: (acc.salaries?.total_tds_deducted || 0) + (r.salaries?.total_tds_deducted || 0),
        tds_on_paid:        (acc.salaries?.tds_on_paid        || 0) + (r.salaries?.tds_on_paid        || 0),
        tds_pending:        (acc.salaries?.tds_pending        || 0) + (r.salaries?.tds_pending        || 0),
      },
      combined: {
        total_tds_deducted: (acc.combined?.total_tds_deducted || 0) + (r.combined?.total_tds_deducted || 0),
        tds_on_paid:        (acc.combined?.tds_on_paid        || 0) + (r.combined?.tds_on_paid        || 0),
        tds_pending:        (acc.combined?.tds_pending        || 0) + (r.combined?.tds_pending        || 0),
      },
    }), {});
    dispatch(tdsSummarySuccess(combined));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch TDS summary');
    dispatch(tdsSummaryFailure());
  }
};
