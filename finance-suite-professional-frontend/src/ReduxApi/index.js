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
import salaryReducer from './salary';
import generalExpenseReducer from './generalExpense';
import challanReducer from './challan';
import categoryReducer from './category';
import productReducer from './product';
import gstSummaryReducer from './gstSummary';
import tdsSummaryReducer from './tdsSummary';
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
    salary: salaryReducer,
    generalExpense: generalExpenseReducer,
    challan: challanReducer,
    category: categoryReducer,
    product: productReducer,
    gstSummary: gstSummaryReducer,
    tdsSummary: tdsSummaryReducer,
  },
});

injectStore(store);

export default store;
