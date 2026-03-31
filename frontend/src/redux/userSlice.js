import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASE_URL } from "../config";

// 🛡️ SECURITY FIX: Strip out tokens from old sessions to prevent XSS
let storedUserInfo = localStorage.getItem("userInfo")
  ? JSON.parse(localStorage.getItem("userInfo"))
  : null;

if (storedUserInfo && storedUserInfo.token) {
  delete storedUserInfo.token;
  localStorage.setItem("userInfo", JSON.stringify(storedUserInfo));
}

const initialState = {
  userInfo: storedUserInfo,
  loading: false,
  error: null,
  success: false,
};

// 👇 1. UPDATE PROFILE ACTION
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (userData, { rejectWithValue }) => {
    try {
      // 🛡️ SECURITY FIX: Token Authorization header removed.
      // Using withCredentials to automatically send HttpOnly cookie.
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const { data } = await axios.put(
        `${BASE_URL}/api/v1/users/profile`,
        userData,
        config,
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
      );
    }
  },
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      // 🛡️ SECURITY FIX: Explicitly ensure token is never saved
      const userData = { ...action.payload };
      delete userData.token;

      state.userInfo = userData;
      localStorage.setItem("userInfo", JSON.stringify(userData));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
      localStorage.removeItem("isBiometricEnabled");
      state.success = false;
      state.error = null;
    },
  },
  // 👇 2. EXTRA REDUCERS
  extraReducers: (builder) => {
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        // 🛡️ SECURITY FIX: Prevent token from being saved on update
        const updatedData = { ...action.payload };
        delete updatedData.token;

        state.userInfo = updatedData;
        localStorage.setItem("userInfo", JSON.stringify(updatedData));
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCredentials, logout } = userSlice.actions;

export default userSlice.reducer;
