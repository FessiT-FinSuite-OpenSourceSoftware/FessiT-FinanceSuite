import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const ENDPOINT = "/ledger";

const ledgerSlice = createSlice({
  name: "ledger",
  initialState: {
    isLoading: false,
    isError:   false,
    entries:   [],      // LedgerEntry[]
    total:     0,       // total matching records (for pagination)
    totalAmount: 0,     // sum of amounts (from backend)
    page:      null,
    limit:     null,
  },
  reducers: {
    ledgerRequest: (state) => {
      state.isLoading = true;
      state.isError   = false;
    },
    ledgerSuccess: (state, { payload }) => {
      state.isLoading    = false;
      state.entries      = payload.data        ?? [];
      state.total        = payload.total       ?? 0;
      state.totalAmount  = payload.total_amount ?? 0;
      state.page         = payload.page        ?? null;
      state.limit        = payload.limit       ?? null;
    },
    ledgerFailure: (state) => {
      state.isLoading = false;
      state.isError   = true;
    },
  },
});

export const { ledgerRequest, ledgerSuccess, ledgerFailure } = ledgerSlice.actions;
export const ledgerSelector = (state) => state.ledger;
export default ledgerSlice.reducer;

/**
 * Fetch ledger entries with optional filters and pagination.
 *
 * params: {
 *   party_id?: string   — filter by customer/vendor ObjectId
 *   from?:     string   — ISO date string (issueDate >=)
 *   to?:       string   — ISO date string (issueDate <=)
 *   page?:     number
 *   limit?:    number
 * }
 */
export const fetchLedger = (params = {}) => async (dispatch) => {
  dispatch(ledgerRequest());
  try {
    const { data } = await axiosInstance.get(ENDPOINT, { params });
    console.log("the data i am received is ", data)
    dispatch(ledgerSuccess(data));
  } catch (error) {
    dispatch(ledgerFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch ledger");
  }
};
