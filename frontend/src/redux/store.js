import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import cartReducer from "./cartSlice"; // 👈 Import kiya

const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer, // 👈 Store mein add kiya
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware(),
});

export default store;
