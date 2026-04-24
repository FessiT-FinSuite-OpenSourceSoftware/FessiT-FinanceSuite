import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const ENDPOINT = "/estimates";

const getId = (value) => value?.$oid || value || "";

const normalizeEstimateItem = (item) => {
  if (!item || typeof item !== "object") return item;

  return {
    ...item,
    name: item.name ?? item.description ?? "",
    description: item.description ?? "",
    quantity: item.quantity ?? item.qty ?? item.hours ?? 0,
    unitPrice: item.unitPrice ?? item.unit_price ?? item.rate ?? 0,
    discount: item.discount ?? item.discountPercent ?? "",
    taxRate: item.taxRate ?? item.tax_rate ?? item.taxPercent ?? "",
    amount: item.amount ?? item.itemTotal ?? 0,
    _id: getId(item._id),
    productId: getId(item.productId || item.ProductId),
  };
};

const normalizeEstimate = (estimate) => {
  if (!estimate || typeof estimate !== "object") return estimate;

  return {
    ...estimate,
    _id: getId(estimate._id),
    id: getId(estimate.id),
    estimateNumber: estimate.estimateNumber ?? estimate.estimate_number ?? "",
    customerId: getId(estimate.customerId || estimate.customer_id),
    customerName: estimate.customerName ?? estimate.customer_name ?? "",
    issueDate: estimate.issueDate ?? estimate.issue_date ?? "",
    expiryDate: estimate.expiryDate ?? estimate.expiry_date ?? "",
    currency: estimate.currency ?? estimate.currency_type ?? "INR",
    discount: estimate.discount ?? estimate.discount_percent ?? "",
    notes: estimate.notes ?? "",
    terms: estimate.terms ?? estimate.terms_and_conditions ?? "",
    subtotal: estimate.subtotal ?? estimate.sub_total ?? 0,
    total: estimate.total ?? 0,
    items: Array.isArray(estimate.items)
      ? estimate.items.map(normalizeEstimateItem)
      : [],
  };
};

const estimateSlice = createSlice({
  name: "estimate",
  initialState: {
    isLoading: false,
    estimateData: [],
    currentEstimate: null,
    nextEstimateNumber: null,
    total: 0,
    isError: false,
  },
  reducers: {
    estimateRequest: (state) => {
      state.isLoading = true;
      state.isError = false;
    },
    estimateSuccess: (state, { payload }) => {
      state.isLoading = false;
      state.isError = false;
      if (Array.isArray(payload)) {
        // No-params path: backend returned a plain array
        state.estimateData = payload.map(normalizeEstimate);
        state.total = payload.length;
      } else if (payload && Array.isArray(payload.data)) {
        // Paginated path: backend returned { data, total, page, limit }
        state.estimateData = payload.data.map(normalizeEstimate);
        state.total = payload.total ?? payload.data.length;
      } else {
        state.estimateData = [];
        state.total = 0;
      }
    },
    estimateOneSuccess: (state, { payload }) => {
      state.isLoading = false;
      state.currentEstimate = normalizeEstimate(payload);
    },
    setNextEstimateNumber: (state, { payload }) => {
      state.nextEstimateNumber = payload;
    },
    estimateFailure: (state) => {
      state.isLoading = false;
      state.isError = true;
    },
  },
});

export const {
  estimateRequest,
  estimateSuccess,
  estimateOneSuccess,
  setNextEstimateNumber,
  estimateFailure,
} = estimateSlice.actions;

export const estimateSelector = (state) => state.estimate;
export default estimateSlice.reducer;

export const fetchNextEstimateNumber = () => async (dispatch) => {
  try {
    const { data } = await axiosInstance.get(`${ENDPOINT}/next-number`);
        console.log("this is what ive received from backend after getting estimiate request",data)

    const nextNumber = data.estimate_number ?? data.estimateNumber ?? data.number ?? "";
    dispatch(setNextEstimateNumber(nextNumber));
    return nextNumber;
  } catch {
    const fallbackNumber = "EST-001";
    dispatch(setNextEstimateNumber(fallbackNumber));
    return fallbackNumber;
  }
};

export const fetchEstimates = (params = {}) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.get(ENDPOINT, { params });
    console.log("Fetched estimates:", data);
    dispatch(estimateSuccess(data));
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch estimates");
  }
};

export const fetchEstimateById = (id) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.get(`${ENDPOINT}/${id}`);
    console.log("qgsjhqGSHq", data)
    dispatch(estimateOneSuccess(data));
    return data;
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch estimate");
    return null;
  }
};

export const fetchEstimatesByCustomer = (customerId) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.get(`${ENDPOINT}/customer/${customerId}`);
    dispatch(estimateSuccess(data));
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch customer estimates");
  }
};

export const createEstimate = (payload) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.post(ENDPOINT, payload);
    toast.success(data?.message || "Estimate created successfully");
    if (data?.data || data?.estimate) {
      dispatch(estimateOneSuccess(data.data || data.estimate || data));
    }
    dispatch(fetchEstimates());
    return data;
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to create estimate");
    throw error;
  }
};

export const updateEstimate = (id, payload) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.put(`${ENDPOINT}/${id}`, payload);
    toast.success(data?.message || "Estimate updated successfully");
    if (data?.data || data?.estimate) {
      dispatch(estimateOneSuccess(data.data || data.estimate || data));
    }
    dispatch(fetchEstimates());
    return data;
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to update estimate");
    throw error;
  }
};

export const updateEstimateStatus = (id, status) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    const { data } = await axiosInstance.put(`${ENDPOINT}/${id}/status`, { status });
    toast.success("Status updated");
    dispatch(fetchEstimates());
    return data;
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to update status");
    throw error;
  }
};

export const deleteEstimate = (id) => async (dispatch) => {
  dispatch(estimateRequest());
  try {
    await axiosInstance.delete(`${ENDPOINT}/${id}`);
    toast.success("Estimate deleted");
    dispatch(fetchEstimates());
  } catch (error) {
    dispatch(estimateFailure());
    toast.error(error?.response?.data?.message || "Failed to delete estimate");
  }
};
