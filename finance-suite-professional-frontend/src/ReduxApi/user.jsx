import { createSlice } from '@reduxjs/toolkit'
import { getConfig, KeyUri } from '../shared/key'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  usersData: [],
  isError: false,
  currentUser: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    getUser: (state) => {
      state.isLoading = true
      state.isError = false
    },

    getUserSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.usersData = payload
    },

    getOneUser: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentUser = payload
    },

    getUserFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.usersData = []
    },
  },
})

export const {
  getUser,
  getUserSuccess,
  getUserFailure,
  getOneUser,
} = userSlice.actions

export const userSelector = (state) => state.user
export default userSlice.reducer

// Create User
export const createUser = (userData) => async (dispatch) => {
  dispatch(getUser())

  try {
    const orgEmail = localStorage.getItem('email')
    const userDataWithOrg = {
      ...userData,
      org_email: orgEmail
    }
    const { data } = await axiosInstance.post('/users', userDataWithOrg)
    toast.success(data.message)
    dispatch(fetchUserData())
  } catch (error) {
    console.error('Error creating user:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getUserFailure())
  }
}

// Fetch All Users
export const fetchUserData = () => async (dispatch) => {
  dispatch(getUser())

  try {
    const orgEmail = localStorage.getItem('email')
    const { data } = await axiosInstance.get(`/users?org_email=${orgEmail}`)
    dispatch(getUserSuccess(data))
  } catch (error) {
    console.error('Error fetching users:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getUserFailure())
  }
}

// Fetch One User
export const fetchOneUser = (userID) => async (dispatch) => {
  dispatch(getUser())

  try {
    const { data } = await axiosInstance.get(`/users/${userID}?t=${Date.now()}`)
    dispatch(getOneUser(data))
  } catch (error) {
    console.error('Error fetching user:', error)
    dispatch(getUserFailure())
  }
}

// Update User
export const updateUser =
  (userID, userData) => async (dispatch) => {
    dispatch(getUser())

    try {
      const orgEmail = localStorage.getItem('email')
      const userDataWithOrg = {
        ...userData,
        org_email: orgEmail
      }
      const { data } = await axiosInstance.put(`/users/${userID}`, userDataWithOrg)
      toast.success(data.message)
      dispatch(fetchUserData())
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getUserFailure())
    }
  }

// Delete User
export const deleteUser = (id) => async (dispatch) => {
  dispatch(getUser())

  try {
    const { data } = await axiosInstance.delete(`/users/${id}`)
    toast.success(data.message)
    dispatch(fetchUserData())
  } catch (error) {
    console.error('Error deleting user:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getUserFailure())
  }
}
