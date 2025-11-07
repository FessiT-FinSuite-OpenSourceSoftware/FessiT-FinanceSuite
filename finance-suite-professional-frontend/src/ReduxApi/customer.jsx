import { createSlice } from '@reduxjs/toolkit'
import { config ,KeyUri} from '../shared/key';
import axios from 'axios'
import {toast} from 'react-toastify'

const initialState = {
   isLoading:false,
   customersData:[],
   isError:false,
   currentCustomer:null
}

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    getCustomer:(state)=>{
        state.isLoading= true;
        state.isError=false
    },
    getCustomerSucces:(state,{payload})=>{
    
        state.isLoading=false;
        state.isError= false;
        state.customersData= payload
    },
    getOneCustomer:(state,{payload})=>{
        state.isLoading=false;
        state.isError= false;
        state.currentCustomer= payload

    },
    getCustomerFailure:(state)=>{
        state.isLoading=false;
        state.isError= true;
        state.customersData=null
    }
  }
});

export const {getCustomer,getCustomerFailure,getCustomerSucces,getOneCustomer} = customerSlice.actions
export const customerSelector = (state)=>state.customer
export default customerSlice.reducer

export const createCustomer =(customerData)=>async(dispatch)=>{
    dispatch(getCustomer())
    try{
        const {data} = await axios.post(KeyUri.BACKENDURI + '/customers',customerData,config)
        console.log(data)
        toast.success(data.message)

    }catch(error){
        console.log("error",error)
        toast.warn(`${error.response.status}-${error.response.data.message}`)

    }
}


export const fetchCustomerData =()=>async(dispatch)=>{
    dispatch(getCustomer())
    let count =0
    try{
        const {data} = await axios.get(KeyUri.BACKENDURI + '/customers',config)
        console.log(count++,data)
        dispatch(getCustomerSucces(data))
        // toast.success(data.message)

    }catch(error){
        console.log("error",error)
        toast.error(`${error.response.status}-${error.response.data.message}`)

    }
}


export const fechOneCustomer = (customerID)=>async(dispatch)=>{
   dispatch(getCustomer())
   try{
    const {data} = await axios.get(KeyUri.BACKENDURI + `/customers/${customerID}`,config)
    console.log(data)
    dispatch(getOneCustomer(data))


   }catch(error){
    console.log(error)
   }
}

export const updateCustomerData = (customerID,customerData)=>async(dispatch)=>{
    dispatch(getCustomer())
    try{
       const {data} = await axios.put(KeyUri.BACKENDURI +`/customer/${customerID}`,customerData,config)
    //    console.log(data)
       toast.success(data.message)
    }catch(error){
        console.log(error)
        toast.error(`${error.response.status}-${error.response.statusText}`)
    }
}
export const deleteCustomer = (id)=>async(dispatch)=>{
    dispatch(getCustomer())
    try{
        const {data} = await axios.delete(KeyUri.BACKENDURI +`/customers/${id}`,config)
        console.log(data)
        toast.success(data.message)
        dispatch(fetchCustomerData())

    }catch(error){
        console.log(error)
        toast.error(`${error.status}-${error.response.statusText}`)
    }
}