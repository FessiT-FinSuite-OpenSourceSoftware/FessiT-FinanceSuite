import { configureStore } from "@reduxjs/toolkit";
import customerReducer from "./customer";
import organisationReducer from './organisation'

export default configureStore({
  reducer: {
    customer: customerReducer,
    organisation:organisationReducer,
  },
});
