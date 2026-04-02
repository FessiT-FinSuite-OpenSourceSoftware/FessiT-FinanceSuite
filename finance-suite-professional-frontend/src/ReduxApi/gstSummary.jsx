import { createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const initialState = {
  isLoading: false,
  isError: false,
  data: null,
  // data shape from GET /invoices/gst-summary:
  // {
  //   month: "2025-07",
  //   outgoing_invoices:   { invoice_count, total_cgst, total_sgst, total_igst, total_gst_collected, paid_amount, paid_invoice_count },
  //   incoming_invoices:   { invoice_count, total_amount, total_cgst, total_sgst, total_igst, total_gst_collected, paid_amount, paid_invoice_count },
  //   expenses:            { expense_count, total_amount, total_cgst, total_sgst, total_igst, total_gst_collected },
  //   general_expenses:    { expense_count, total_amount, total_cgst, total_sgst, total_igst, total_gst_collected },
  //   combined_expense_gst:{ expense_count, total_amount, total_tax, total_cgst, total_sgst, total_igst, total_gst_collected },
  //   net_gst_payable:     { outgoing_gst_collected, incoming_gst_collected, expense_gst_collected, net_payable }
  // }
};

const gstSummarySlice = createSlice({
  name: 'gstSummary',
  initialState,
  reducers: {
    gstSummaryRequest: (state) => { state.isLoading = true; state.isError = false; },
    gstSummarySuccess: (state, { payload }) => { state.isLoading = false; state.data = payload; },
    gstSummaryFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { gstSummaryRequest, gstSummarySuccess, gstSummaryFailure } = gstSummarySlice.actions;
export const gstSummarySelector = (state) => state.gstSummary;
export default gstSummarySlice.reducer;

export const fetchGstSummary = () => async (dispatch) => {
  dispatch(gstSummaryRequest());
  try {
    const { data } = await axiosInstance.get('/invoices/gst-summary');
    dispatch(gstSummarySuccess(data));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch GST summary');
    dispatch(gstSummaryFailure());
  }
};
