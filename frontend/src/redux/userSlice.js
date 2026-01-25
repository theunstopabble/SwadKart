import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASE_URL } from "../config"; // 👈 IMPORT FROM CONFIG (Best Practice)

const initialState = {
  userInfo: localStorage.getItem("userInfo")
    ? JSON.parse(localStorage.getItem("userInfo"))
    : null,
  loading: false,
  error: null,
  success: false,
};

// 👇 1. UPDATE PROFILE ACTION
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (userData, { getState, rejectWithValue }) => {
    try {
      const {
        user: { userInfo },
      } = getState();

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      // ✅ FIX: Using BASE_URL from config
      const { data } = await axios.put(
        `${BASE_URL}/api/v1/users/profile`,
        userData,
        config
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
      // 🔐 Clear biometric flag on logout (Industry Standard)
      // Credentials remain in database, flag restored on next login
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
        state.userInfo = action.payload; // ✅ Update Redux State
        localStorage.setItem("userInfo", JSON.stringify(action.payload)); // ✅ Update LocalStorage
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCredentials, logout } = userSlice.actions;

export default userSlice.reducer;
