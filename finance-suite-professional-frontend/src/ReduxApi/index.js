import { configureStore } from "@reduxjs/toolkit";
import customerReducer from "./customer";

export default configureStore({
  reducer: {
    customer: customerReducer,
  },
});
