import { configureStore } from "@reduxjs/toolkit";
import customerReducer from "./customer";
import organisationReducer from './organisation';
import expenseReducer from './expense';
import invoiceReducer from './invoice';
import purchaseOrderReducer from './purchaseOrder';
import userReducer from './user';
import authReducer from './auth';
import projectReducer from './project';
import costCenterReducer from './costCenter';
import incomingInvoiceReducer from './incomingInvoice';
import { injectStore } from '../utils/axiosInstance';

const store = configureStore({
  reducer: {
    customer: customerReducer,
    organisation: organisationReducer,
    expense: expenseReducer,
    invoice: invoiceReducer,
    purchaseOrder: purchaseOrderReducer,
    user: userReducer,
    auth: authReducer,
    costCenter: costCenterReducer,
    project: projectReducer,
    incomingInvoice: incomingInvoiceReducer,
  },
});

injectStore(store);

export default store;
