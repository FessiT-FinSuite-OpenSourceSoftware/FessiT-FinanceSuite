import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const ENDPOINT = "/asset-categories";

const assetCategorySlice = createSlice({
  name: "assetCategory",
  initialState: {
    isLoading: false,
    assetCategoryData: [],
    isError: false,
  },
  reducers: {
    assetCategoryRequest: (state) => { state.isLoading = true; state.isError = false; },
    assetCategorySuccess: (state, { payload }) => { state.isLoading = false; state.assetCategoryData = payload; },
    assetCategoryFailure: (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { assetCategoryRequest, assetCategorySuccess, assetCategoryFailure } = assetCategorySlice.actions;
export const assetCategorySelector = (state) => state.assetCategory;
export default assetCategorySlice.reducer;

export const fetchAssetCategories = () => async (dispatch) => {
  dispatch(assetCategoryRequest());
  try {
    const { data } = await axiosInstance.get(ENDPOINT);
    dispatch(assetCategorySuccess(Array.isArray(data) ? data : data?.categories ?? []));
  } catch (error) {
    dispatch(assetCategoryFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch asset categories");
  }
};

export const createAssetCategory = (category_name) => async (dispatch) => {
  dispatch(assetCategoryRequest());
  try {
    const { data } = await axiosInstance.post(ENDPOINT, { category_name });
    toast.success(data?.message || "Asset category created");
    dispatch(fetchAssetCategories());
    return data;
  } catch (error) {
    dispatch(assetCategoryFailure());
    toast.error(error?.response?.data?.message || "Failed to create asset category");
    throw error;
  }
};

export const updateAssetCategory = (id, category_name) => async (dispatch) => {
  dispatch(assetCategoryRequest());
  try {
    const { data } = await axiosInstance.put(`${ENDPOINT}/${id}`, { category_name });
    toast.success(data?.message || "Asset category updated");
    dispatch(fetchAssetCategories());
    return data;
  } catch (error) {
    dispatch(assetCategoryFailure());
    toast.error(error?.response?.data?.message || "Failed to update asset category");
    throw error;
  }
};

export const deleteAssetCategory = (id) => async (dispatch) => {
  dispatch(assetCategoryRequest());
  try {
    await axiosInstance.delete(`${ENDPOINT}/${id}`);
    toast.success("Asset category deleted");
    dispatch(fetchAssetCategories());
  } catch (error) {
    dispatch(assetCategoryFailure());
    toast.error(error?.response?.data?.message || "Failed to delete asset category");
  }
};
