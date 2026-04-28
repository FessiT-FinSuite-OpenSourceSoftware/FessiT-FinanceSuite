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

export const fetchGstSummary = (selectedMonths) => async (dispatch) => {
  dispatch(gstSummaryRequest());
  try {
    const months = Array.isArray(selectedMonths) ? selectedMonths : [selectedMonths];
    const results = await Promise.all(
      months.map(({ year, month }) => {
        const params = new URLSearchParams();
        params.set('year', year);
        params.set('month', String(month).padStart(2, '0'));
        return axiosInstance.get(`/invoices/gst-summary?${params.toString()}`)
          .then(r => r.data);
      })
    );
    const sumSection = (acc, cur, key) => ({
      invoice_count:      (acc[key]?.invoice_count      || 0) + (cur[key]?.invoice_count      || 0),
      expense_count:      (acc[key]?.expense_count      || 0) + (cur[key]?.expense_count      || 0),
      total_cgst:         (acc[key]?.total_cgst         || 0) + (cur[key]?.total_cgst         || 0),
      total_sgst:         (acc[key]?.total_sgst         || 0) + (cur[key]?.total_sgst         || 0),
      total_igst:         (acc[key]?.total_igst         || 0) + (cur[key]?.total_igst         || 0),
      total_gst_collected:(acc[key]?.total_gst_collected|| 0) + (cur[key]?.total_gst_collected|| 0),
      total_amount:       (acc[key]?.total_amount       || 0) + (cur[key]?.total_amount       || 0),
      total_tax:          (acc[key]?.total_tax          || 0) + (cur[key]?.total_tax          || 0),
      paid_amount:        (acc[key]?.paid_amount        || 0) + (cur[key]?.paid_amount        || 0),
      paid_invoice_count: (acc[key]?.paid_invoice_count || 0) + (cur[key]?.paid_invoice_count || 0),
      breakdown:          [...(acc[key]?.breakdown || []), ...(cur[key]?.breakdown || [])],
    });
    const combined = results.reduce((acc, r) => ({
      month: r.month,
      outgoing_invoice_details: sumSection(acc, r, 'outgoing_invoice_details'),
      outgoing_invoices:        sumSection(acc, r, 'outgoing_invoices'),
      incoming_invoices:        sumSection(acc, r, 'incoming_invoices'),
      expenses:                 sumSection(acc, r, 'expenses'),
      general_expenses:         sumSection(acc, r, 'general_expenses'),
      combined_expense_gst:     sumSection(acc, r, 'combined_expense_gst'),
      net_gst_payable: {
        outgoing_gst_collected: (acc.net_gst_payable?.outgoing_gst_collected || 0) + (r.net_gst_payable?.outgoing_gst_collected || 0),
        incoming_gst_collected: (acc.net_gst_payable?.incoming_gst_collected || 0) + (r.net_gst_payable?.incoming_gst_collected || 0),
        expense_gst_collected:  (acc.net_gst_payable?.expense_gst_collected  || 0) + (r.net_gst_payable?.expense_gst_collected  || 0),
        net_payable:            (acc.net_gst_payable?.net_payable            || 0) + (r.net_gst_payable?.net_payable            || 0),
      },
    }), {});
    dispatch(gstSummarySuccess(combined));
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to fetch GST summary');
    dispatch(gstSummaryFailure());
  }
};
