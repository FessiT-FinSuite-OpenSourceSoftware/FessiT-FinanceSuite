import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  organsationData: [],
  isError: false,
  currentOrganisation: null,
  lastFetchedEmail: null, // Cache the last fetched email
  lastFetchTime: null, // Cache timestamp
}

const organisationSlice = createSlice({
  name: 'organisation',
  initialState,
  reducers: {
    getOrganisation: (state) => {
      state.isLoading = true
      state.isError = false
    },
    getOrganisationSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.organsationData = payload
    },
    getOneOrganisation: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentOrganisation = payload
      state.lastFetchTime = Date.now()
    },
    getOrganisationFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.organsationData = []
    },
    updateCache: (state, { payload }) => {
      state.lastFetchedEmail = payload.email
    },
    updateOrganisationSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentOrganisation = payload
      state.lastFetchTime = Date.now()
    },
    clearLoading: (state) => {
      state.isLoading = false
    },
  },
})

export const {
  getOrganisation,
  getOrganisationFailure,
  getOrganisationSuccess,
  getOneOrganisation,
  updateOrganisationSuccess,
  clearLoading,
} = organisationSlice.actions

export const orgamisationSelector = (state) => state.organisation
export default organisationSlice.reducer

export const createOrganisation = (orgaisationData) => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axiosInstance.post('/organisation', orgaisationData)
    toast.success(data.message || 'Organisation created successfully')
    dispatch(getOneOrganisation(data))
    return data
  } catch (error) {
    console.error('Error creating organisation:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getOrganisationFailure())
    throw error
  }
}


// Fetch Organisation by Email
export const fetchOrganisationByEmail = (email) => async (dispatch, getState) => {
  const { organisation } = getState()
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
  
  // Check if we have cached data for this email
  if (
    organisation.currentOrganisation &&
    organisation.lastFetchedEmail === email &&
    organisation.lastFetchTime &&
    Date.now() - organisation.lastFetchTime < CACHE_DURATION
  ) {
    // Return cached data without making API call
    return organisation.currentOrganisation
  }
  
  dispatch(getOrganisation())
  try {
    const { data } = await axiosInstance.get(`/organisation/by-email/${email}`)
    // Directly set the organisation data instead of making another API call
    dispatch(getOneOrganisation(data))
    // Update cache info
    dispatch({ type: 'organisation/updateCache', payload: { email } })
    return data
  } catch (error) {
    console.error('Error fetching organisation by email:', error)
    dispatch(getOrganisationFailure())
    throw error
  }
}

export const fetchOrganisationData = () => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axiosInstance.get('/organisation')
    dispatch(getOrganisationSuccess(data))
  } catch (error) {
    console.error('Error fetching :', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getOrganisationFailure())
  }
}


export const fetchOneOrganisation = (orgID) => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axiosInstance.get(`/organisation/${orgID}?t=${Date.now()}`)
    dispatch(getOneOrganisation(data))
  } catch (error) {
    console.error('Error fetching', error)
    dispatch(getOrganisationFailure())
  }
}


export const updateOrganisationData =
  (organID, organData) => async (dispatch, getState) => {
    dispatch(getOrganisation())
    try {
      const { data } = await axiosInstance.put(`/organisationsUpdate/${organID}`, organData)
      toast.success(data.message)
      
      // If the API returns the updated organisation data, use it
      if (data.organisation || data._id) {
        dispatch(updateOrganisationSuccess(data.organisation || data))
      } else {
        // If API doesn't return updated data, merge with current state
        const { organisation } = getState()
        const updatedOrg = {
          ...organisation.currentOrganisation,
          ...organData,
          _id: organisation.currentOrganisation._id
        }
        dispatch(updateOrganisationSuccess(updatedOrg))
      }
    } catch (error) {
      console.error('Redux: Error updating:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getOrganisationFailure())
      throw error
    }
  }

// ✅ Delete customer
export const deleteCustomer = (id) => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axiosInstance.delete(`/organisation/${id}`)
    toast.success(data.message)
    dispatch(fetchOrganisationData())
  } catch (error) {
    console.error('Error deleting:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getOrganisationFailure())
  }
}
