import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const CHALLAN_ENDPOINT = "/challans";

const initialState = {
  isLoading: false,
  challanData: [],
  isError: false,
};

const challanSlice = createSlice({
  name: "challan",
  initialState,
  reducers: {
    challanRequest: (state) => {
      state.isLoading = true;
      state.isError = false;
    },
    challanSuccess: (state, { payload }) => {
      state.isLoading = false;
      state.challanData = payload;
    },
    challanFailure: (state) => {
      state.isLoading = false;
      state.isError = true;
    },
  },
});

export const { challanRequest, challanSuccess, challanFailure } = challanSlice.actions;
export const challanSelector = (state) => state.challan;
export default challanSlice.reducer;

const normalizeChallans = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.challans)) return data.challans;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const fetchChallans = () => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.get(CHALLAN_ENDPOINT);
    dispatch(challanSuccess(normalizeChallans(data)));
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch challans");
  }
};

export const createChallan = (payload) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.post(CHALLAN_ENDPOINT, payload);
    toast.success(data?.message || "Challan created successfully");
    dispatch(fetchChallans());
    return data;
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to create challan");
    throw error;
  }
};

export const updateChallan = (id, payload) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.put(`${CHALLAN_ENDPOINT}/${id}`, payload);
    toast.success(data?.message || "Challan updated successfully");
    dispatch(fetchChallans());
    return data;
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to update challan");
    throw error;
  }
};

export const deleteChallan = (id) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.delete(`${CHALLAN_ENDPOINT}/${id}`);
    toast.success(data?.message || "Challan deleted successfully");
    dispatch(fetchChallans());
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to delete challan");
  }
};
