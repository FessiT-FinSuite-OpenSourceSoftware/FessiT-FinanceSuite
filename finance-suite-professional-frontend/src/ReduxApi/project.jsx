import { createSlice } from '@reduxjs/toolkit'
import axiosInstance, { toastError } from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  projectsData: [],
  isError: false,
}

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    getProject: (state) => { state.isLoading = true; state.isError = false },
    getProjectSuccess: (state, { payload }) => { state.isLoading = false; state.projectsData = payload },
    getProjectFailure: (state) => { state.isLoading = false; state.isError = true },
  },
})

export const { getProject, getProjectSuccess, getProjectFailure } = projectSlice.actions
export const projectSelector = (state) => state.project
export default projectSlice.reducer

export const fetchAllProjects = () => async (dispatch) => {
  dispatch(getProject())
  try {
    const { data } = await axiosInstance.get('/projects')
    dispatch(getProjectSuccess(data))
  } catch (error) {
    console.error('Error fetching projects:', error)
    toastError(error)
    dispatch(getProjectFailure())
  }
}

export const addProject = (customerId, projectData) => async (dispatch) => {
  dispatch(getProject())
  try {
    await axiosInstance.post(`/customers/${customerId}/projects`, projectData)
    toast.success('Project added successfully')
    dispatch(fetchAllProjects())
  } catch (error) {
    console.error('Error adding project:', error)
    toastError(error)
    dispatch(getProjectFailure())
    throw error
  }
}

export const updateProject = (customerId, index, projectData) => async (dispatch) => {
  dispatch(getProject())
  try {
    await axiosInstance.put(`/customers/${customerId}/projects/${index}`, projectData)
    toast.success('Project updated successfully')
    dispatch(fetchAllProjects())
  } catch (error) {
    console.error('Error updating project:', error)
    toastError(error)
    dispatch(getProjectFailure())
    throw error
  }
}

export const deleteProject = (customerId, index) => async (dispatch) => {
  dispatch(getProject())
  try {
    await axiosInstance.delete(`/customers/${customerId}/projects/${index}`)
    toast.success('Project deleted successfully')
    dispatch(fetchAllProjects())
  } catch (error) {
    console.error('Error deleting project:', error)
    toastError(error)
    dispatch(getProjectFailure())
  }
}
