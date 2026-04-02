import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

const ENDPOINT = "/categories";

const categorySlice = createSlice({
  name: "category",
  initialState: { 
    isLoading: false, 
    categoryData: [], 
    isError: false 
  },
  reducers: {
    categoryRequest:
      (state) => { state.isLoading = true; state.isError = false; },
    categorySuccess:
      (state, { payload }) => { state.isLoading = false; state.categoryData = payload; },
    categoryFailure:
      (state) => { state.isLoading = false; state.isError = true; },
  },
});

export const { categoryRequest, categorySuccess, categoryFailure } = categorySlice.actions;
export const categorySelector = (state) => state.category;
export default categorySlice.reducer;

export const fetchCategories = () => async (dispatch) => {
  dispatch(categoryRequest());
  try {
    const { data } = await axiosInstance.get(ENDPOINT);
    dispatch(categorySuccess(Array.isArray(data) ? data : data?.categories ?? []));
  } catch (error) {
    dispatch(categoryFailure());
    toast.error(error?.response?.data?.message || "Failed to fetch categories");
  }
};

export const createCategory = (category_name) => async (dispatch) => {
  dispatch(categoryRequest());
  try {
    const { data } = await axiosInstance.post(ENDPOINT, { category_name });
    toast.success(data?.message || "Category created");
    dispatch(fetchCategories());
    return data;
  } catch (error) {
    dispatch(categoryFailure());
    toast.error(error?.response?.data?.message || "Failed to create category");
    throw error;
  }
};

export const updateCategory = (id, category_name) => async (dispatch) => {
  dispatch(categoryRequest());
  try {
    const { data } = await axiosInstance.put(`${ENDPOINT}/${id}`, { category_name });
    toast.success(data?.message || "Category updated");
    dispatch(fetchCategories());
    return data;
  } catch (error) {
    dispatch(categoryFailure());
    toast.error(error?.response?.data?.message || "Failed to update category");
    throw error;
  }
};

export const deleteCategory = (id) => async (dispatch) => {
  dispatch(categoryRequest());
  try {
    await axiosInstance.delete(`${ENDPOINT}/${id}`);
    toast.success("Category deleted");
    dispatch(fetchCategories());
  } catch (error) {
    dispatch(categoryFailure());
    toast.error(error?.response?.data?.message || "Failed to delete category");
  }
};
