import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const GST_CHALLAN_ENDPOINT = "/gst-challans";

const initialState = {
  isLoading: false,
  gstchallanData: [],
  isError: false,
};

const challanSlice = createSlice({
  name: "gstChallan",
  initialState,
  reducers: {
    challanRequest: (state) => {
      state.isLoading = true;
      state.isError = false;
    },
    challanSuccess: (state, { payload }) => {
      state.isLoading = false;
      state.gstchallanData = payload;
    },
    challanFailure: (state) => {
      state.isLoading = false;
      state.isError = true;
    },
  },
});

export const { challanRequest, challanSuccess, challanFailure } = challanSlice.actions;
export const challanSelector = (state) => state.gstChallan;
export default challanSlice.reducer;

const normalizeChallans = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.challans)) return data.challans;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const fetchgstChallans = () => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.get(GST_CHALLAN_ENDPOINT);
    dispatch(challanSuccess(normalizeChallans(data)));
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch challans");
  }
};

export const creategstChallan = (payload) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.post(GST_CHALLAN_ENDPOINT, payload);
    toast.success(data?.message || "Challan created successfully");
    dispatch(fetchgstChallans());
    return data;
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to create challan");
    throw error;
  }
};

export const updategstChallan = (id, payload) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.put(`${GST_CHALLAN_ENDPOINT}/${id}`, payload);
    toast.success(data?.message || "Challan updated successfully");
    dispatch(fetchgstChallans());
    return data;
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to update challan");
    throw error;
  }
};

export const deletegstChallan = (id) => async (dispatch) => {
  dispatch(challanRequest());
  try {
    const { data } = await axiosInstance.delete(`${GST_CHALLAN_ENDPOINT}/${id}`);
    toast.success(data?.message || "Challan deleted successfully");
    dispatch(fetchgstChallans());
  } catch (error) {
    dispatch(challanFailure());
    toast.error(error?.response?.data?.message || "Failed to delete challan");
  }
};
