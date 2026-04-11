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

const userInfoFromStorage = localStorage.getItem("userInfo")
  ? JSON.parse(localStorage.getItem("userInfo"))
  : null;

const initialState = {
  userInfo: userInfoFromStorage,
  loading: false,
  error: null,
  success: false,
};

// 👇 1. VALIDATE SESSION (Check if JWT cookie is still valid)
export const validateSession = createAsyncThunk(
  "user/validateSession",
  async (_, { dispatch }) => {
    try {
      const response = await fetch("/api/v1/users/profile", {
        credentials: "include",
      });
      // Only logout on explicit 401 (invalid/expired token)
      if (response.status === 401) {
        dispatch(logout());
        return null;
      }
      // For 500, network errors, Render cold start timeouts — keep user logged in
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch {
      // Network error (Render sleeping) — do NOT logout, just silently fail
      return null;
    }
  },
);

// 👇 2. UPDATE PROFILE ACTION
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
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
      localStorage.removeItem("couponDiscount");
      localStorage.removeItem("appliedCoupon");
    },
  },
  // 👇 2. EXTRA REDUCERS
  extraReducers: (builder) => {
    builder
      .addCase(validateSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        localStorage.setItem("userInfo", JSON.stringify(action.payload));
      })
      .addCase(validateSession.rejected, (state) => {
        state.loading = false;
        state.userInfo = null;
        localStorage.removeItem("userInfo");
        localStorage.removeItem("isBiometricEnabled");
      })
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
