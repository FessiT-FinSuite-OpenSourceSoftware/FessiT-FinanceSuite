import { createSlice } from '@reduxjs/toolkit'
import { config, KeyUri } from '../shared/key'
import axios from 'axios'
import { toast } from 'react-toastify'

const initialState = {
  isLoading: false,
  organsationData: [],
  isError: false,
  currentOrganisation: null,
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
    },
    getOrganisationFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.organsationData = []
    },
  },
})

export const {
  getOrganisation,
  getOrganisationFailure,
  getOrganisationSuccess,
  getOneOrganisation,
} = organisationSlice.actions

export const orgamisationSelector = (state) => state.organisation
export default organisationSlice.reducer

export const createOrganisation = (orgaisationData) => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axios.post(
      `${KeyUri.BACKENDURI}/organisation`,
      orgaisationData,
      config
    )
    console.log(data)
    toast.success(data.message)
    
    dispatch(fetchOrganisationData()) // Refresh list after creation
  } catch (error) {
    console.error('Error creating organisation:', error)
    toast.error(
      error?.response?.data?.message ||
        `Failed: ${error?.response?.statusText || 'Unknown error'}`
    )
    dispatch(getOrganisationFailure())
  }
}


export const fetchOrganisationData = () => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axios.get(`${KeyUri.BACKENDURI}/organisation`, config)
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
    const { data } = await axios.get(
      `${KeyUri.BACKENDURI}/organisation/${orgID}`,
      config
    )
    dispatch(getOneOrganisation(data))
  } catch (error) {
    console.error('Error fetching', error)
    dispatch(getOrganisationFailure())
  }
}


export const updateOrganisationData =
  (organID, organData) => async (dispatch) => {
    dispatch(getOrganisation())
    try {
      const { data } = await axios.put(
        `${KeyUri.BACKENDURI}/organisation/${organID}`,
        organData,
        config
      )
      toast.success(data.message)
      dispatch(fetchOrganisationData())
    } catch (error) {
      console.error('Error updating:', error)
      toast.error(
        error?.response?.data?.message ||
          `Failed: ${error?.response?.statusText || 'Unknown error'}`
      )
      dispatch(getOrganisationFailure())
    }
  }

// ✅ Delete customer
export const deleteCustomer = (id) => async (dispatch) => {
  dispatch(getOrganisation())
  try {
    const { data } = await axios.delete(
      `${KeyUri.BACKENDURI}/organisation/${id}`,
      config
    )
    // console.log(data)
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
