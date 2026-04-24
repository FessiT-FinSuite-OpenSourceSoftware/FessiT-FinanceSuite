import { createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../utils/axiosInstance'
import { toast } from 'react-toastify'

const normalizeAddress = (address) => {
  if (!address) return null
  if (typeof address === 'string') {
    return { label: 'Primary Address', value: address, isEditing: false }
  }

  return {
    ...address,
    label: address.label || 'Primary Address',
    value: address.value || address.address || '',
    isEditing: Boolean(address.isEditing),
  }
}

const normalizeServiceId = (serviceId) => {
  if (!serviceId) return null
  if (typeof serviceId === 'string') return serviceId
  if (typeof serviceId === 'object') {
    return serviceId.$oid || serviceId.oid || serviceId.id || null
  }
  return null
}

const normalizeService = (service) => {
  if (!service || typeof service !== 'object') return service

  return {
    ...service,
    id: normalizeServiceId(service.id ?? service._id),
    serviceName: service.serviceName ?? service.service_name ?? '',
    serviceDescription:
      service.serviceDescription ?? service.service_description ?? '',
    serviceAmount:
      service.serviceAmount ?? service.service_amount ?? '',
    organisationId:
      normalizeServiceId(service.organisationId ?? service.organisation_id) ?? null,
  }
}

const normalizeOrganisation = (organisation) => {
  if (!organisation || typeof organisation !== 'object') return organisation

  const addresses = Array.isArray(organisation.addresses)
    ? organisation.addresses.map(normalizeAddress).filter(Boolean)
    : []
  const services = Array.isArray(organisation.services)
    ? organisation.services.map(normalizeService).filter(Boolean)
    : []

  return {
    ...organisation,
    organizationName: organisation.organizationName || organisation.companyName || '',
    companyName: organisation.companyName || organisation.organizationName || '',
    addresses,
    services,
    serviceIds: Array.isArray(organisation.serviceIds)
      ? organisation.serviceIds.map(normalizeServiceId).filter(Boolean)
      : Array.isArray(organisation.service_ids)
        ? organisation.service_ids.map(normalizeServiceId).filter(Boolean)
        : [],
    invoicePrefix: organisation.invoicePrefix ?? organisation.invoice_prefix ?? '',
    startingInvoiceNo:
      organisation.startingInvoiceNo ?? organisation.starting_invoice_no ?? '',
    dateFormat: organisation.dateFormat ?? organisation.date_format ?? 'DD/MM/YYYY',
    paymentTerms: organisation.paymentTerms ?? organisation.payment_terms ?? '',
    latePaymentFee: organisation.latePaymentFee ?? organisation.late_payment_fee ?? '',
    earlyDiscount: organisation.earlyDiscount ?? organisation.early_discount ?? '',
    discountDays: organisation.discountDays ?? organisation.discount_days ?? '',
    paymentInstructions:
      organisation.paymentInstructions ?? organisation.payment_instructions ?? '',
    accountHolder: organisation.accountHolder ?? organisation.account_holder ?? '',
    bankName: organisation.bankName ?? organisation.bank_name ?? '',
    accountNumber: organisation.accountNumber ?? organisation.account_number ?? '',
    ifscCode: organisation.ifscCode ?? organisation.ifsc_code ?? '',
    upiId: organisation.upiId ?? organisation.upi_id ?? '',
    footerNote: organisation.footerNote ?? organisation.footer_note ?? '',
    taxRegime: organisation.taxRegime ?? organisation.tax_regime ?? 'GST',
    taxType: organisation.taxType ?? organisation.tax_type ?? 'exclusive',
    inputTaxCredit: organisation.inputTaxCredit ?? organisation.input_tax_credit ?? '',
    requireHSN: organisation.requireHSN ?? organisation.require_hsn ?? '',
    roundingRule: organisation.roundingRule ?? organisation.rounding_rule ?? '',
    taxNotes: organisation.taxNotes ?? organisation.tax_notes ?? '',
    enabledMethods: organisation.enabledMethods ?? organisation.enabled_methods ?? {},
    paymentBankName:
      organisation.paymentBankName ?? organisation.payment_bank_name ?? '',
    paymentAccountNo:
      organisation.paymentAccountNo ?? organisation.payment_account_no ?? '',
    paymentIFSC: organisation.paymentIFSC ?? organisation.payment_ifsc ?? '',
    paymentAccountHolder:
      organisation.paymentAccountHolder ?? organisation.payment_account_holder ?? '',
    paymentUpiId: organisation.paymentUpiId ?? organisation.payment_upi_id ?? '',
    paypalEmail: organisation.paypalEmail ?? organisation.paypal_email ?? '',
    paypalClientId: organisation.paypalClientId ?? organisation.paypal_client_id ?? '',
    cardProvider: organisation.cardProvider ?? organisation.card_provider ?? '',
    cardApiKey: organisation.cardApiKey ?? organisation.card_api_key ?? '',
    cashInstructions:
      organisation.cashInstructions ?? organisation.cash_instructions ?? '',
    customPaymentName:
      organisation.customPaymentName ?? organisation.custom_payment_name ?? '',
  }
}

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
      state.currentOrganisation = normalizeOrganisation(payload)
      state.lastFetchedEmail = payload?.email ?? state.lastFetchedEmail
      state.lastFetchTime = Date.now()
    },
    getOrganisationFailure: (state) => {
      state.isLoading = false
      state.isError = true
      state.organsationData = []
    },
    updateCache: (state, { payload }) => {
      state.lastFetchedEmail = payload.email
      state.lastFetchTime = Date.now()
    },
    updateOrganisationSuccess: (state, { payload }) => {
      state.isLoading = false
      state.isError = false
      state.currentOrganisation = normalizeOrganisation(payload)
      state.lastFetchedEmail = payload?.email ?? state.lastFetchedEmail
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
    dispatch(getOneOrganisation(normalizeOrganisation(data)))
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
export const fetchOrganisationByEmail = (email, forceRefresh = false) => async (dispatch, getState) => {
  const { organisation } = getState()
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
  
  // Check if we have cached data for this email
  if (
    !forceRefresh &&
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
    const normalized = normalizeOrganisation(data)
    dispatch(getOneOrganisation(normalized))
    // Update cache info
    dispatch({ type: 'organisation/updateCache', payload: { email: normalized?.email || email } })
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
    dispatch(getOrganisationSuccess(Array.isArray(data) ? data.map(normalizeOrganisation) : data))
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
    dispatch(getOneOrganisation(normalizeOrganisation(data)))
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
        const normalized = normalizeOrganisation(data.organisation || data)
        dispatch(updateOrganisationSuccess(normalized))
        dispatch({ type: 'organisation/updateCache', payload: { email: normalized?.email || organData?.email } })
      } else {
        // If API doesn't return updated data, merge with current state
        const { organisation } = getState()
        const updatedOrg = {
          ...normalizeOrganisation(organisation.currentOrganisation),
          ...organData,
          _id: organisation.currentOrganisation._id
        }
        const normalized = normalizeOrganisation(updatedOrg)
        dispatch(updateOrganisationSuccess(normalized))
        dispatch({ type: 'organisation/updateCache', payload: { email: normalized?.email || organData?.email } })
        dispatch(fetchOrganisationData())
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
