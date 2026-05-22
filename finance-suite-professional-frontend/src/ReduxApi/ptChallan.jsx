import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const PT_CHALLAN_ENDPOINT = "/pt-challans";

const initialState = {
  isLoading: false,
  ptChallanData: [],
  isError: false,
};

const ptChallanSlice = createSlice({
  name: "ptChallan",
  initialState,
  reducers: {
    ptChallanRequest: (state) => { state.isLoading = true; state.isError = false; },
    ptChallanSuccess: (state, { payload }) => { state.isLoading = false; state.ptChallanData = payload; },
    ptChallanFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { ptChallanRequest, ptChallanSuccess, ptChallanFailure } = ptChallanSlice.actions;
export const ptChallanSelector = (state) => state.ptChallan;
export default ptChallanSlice.reducer;

const normalize = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const fetchPtChallans = () => async (dispatch) => {
  dispatch(ptChallanRequest());
  try {
    const { data } = await axiosInstance.get(PT_CHALLAN_ENDPOINT);
    dispatch(ptChallanSuccess(normalize(data)));
  } catch (error) {
    dispatch(ptChallanFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch PT challans");
  }
};

export const createPtChallan = (payload) => async (dispatch) => {
  dispatch(ptChallanRequest());
  try {
    const { data } = await axiosInstance.post(PT_CHALLAN_ENDPOINT, payload);
    toast.success("PT Challan created successfully");
    dispatch(fetchPtChallans());
    return data;
  } catch (error) {
    dispatch(ptChallanFailure());
    toast.error(error?.response?.data?.message || "Failed to create PT challan");
    throw error;
  }
};

export const updatePtChallan = (id, payload) => async (dispatch) => {
  dispatch(ptChallanRequest());
  try {
    const { data } = await axiosInstance.put(`${PT_CHALLAN_ENDPOINT}/${id}`, payload);
    toast.success("PT Challan updated successfully");
    dispatch(fetchPtChallans());
    return data;
  } catch (error) {
    dispatch(ptChallanFailure());
    toast.error(error?.response?.data?.message || "Failed to update PT challan");
    throw error;
  }
};

export const deletePtChallan = (id) => async (dispatch) => {
  dispatch(ptChallanRequest());
  try {
    await axiosInstance.delete(`${PT_CHALLAN_ENDPOINT}/${id}`);
    toast.success("PT Challan deleted successfully");
    dispatch(fetchPtChallans());
  } catch (error) {
    dispatch(ptChallanFailure());
    toast.error(error?.response?.data?.message || "Failed to delete PT challan");
  }
};
