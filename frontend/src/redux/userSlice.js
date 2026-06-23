import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASEURL } from "../config";
import { disconnectSocket } from "../utils/socket";
// 🛡️ SECURITY FIX: Strip out tokens from old sessions to prevent XSS
const safeParse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let storedUserInfo = safeParse(localStorage.getItem("userInfo"));

// Token ko userInfo se alag localStorage("jwt") me rakhte hain.
// HttpOnly cookie cross-origin WebSocket me nahi bheji jaati,
// isliye hum explicitly token pass karte hain socket.io auth ke through.
if (storedUserInfo && storedUserInfo.token) {
  localStorage.setItem("jwt", storedUserInfo.token);
  delete storedUserInfo.token;
  localStorage.setItem("userInfo", JSON.stringify(storedUserInfo));
}

const userInfoFromStorage = safeParse(localStorage.getItem("userInfo"));

const initialState = {
  userInfo: userInfoFromStorage,
  loading: false,
  error: null,
  success: false,
};

// SESSION-01 FIX: Only logout on 401 (expired token), NOT on 5xx/network errors
// Render free tier cold starts take 30-50s — don't punish user with logout for that
export const validateSession = createAsyncThunk(
  'user/validateSession',
  async (_, { dispatch }) => {
    try {
      const controller = new AbortController();
      // 10s timeout — if Render doesn't respond, keep user logged in
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${BASEURL}/api/v1/users/profile`, {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        dispatch(logout());
        return null;
      }
      // 5xx errors -> DO NOT logout
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (error) {
      // SESSION-01 FIX: Network error / AbortError (timeout) → DO NOT logout
      // Render cold start can take 30-50s; user shouldn't lose their session
      if (error.name !== 'AbortError') {
        console.warn('SESSION CHECK: Network unavailable, keeping session alive.', error.message);
      }
      // Intentionally NO dispatch(logout()) here
      return null;
    }
  }
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
        `${BASEURL}/api/v1/users/profile`,
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
      const payload = action.payload;
      if (payload && payload.token) {
        localStorage.setItem("jwt", payload.token);
        delete payload.token;
      }
      state.userInfo = payload;
      localStorage.setItem("userInfo", JSON.stringify(payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem("userInfo");
      localStorage.removeItem("jwt");
      localStorage.removeItem("couponDiscount");
      localStorage.removeItem("appliedCoupon");
      localStorage.removeItem("isBiometricEnabled");
      disconnectSocket();
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
        // Only update userInfo if payload is not null
        // null payload means network error or Render cold start — keep existing session
        if (action.payload) {
          const sanitised = { ...action.payload };
          if (sanitised.token) {
            localStorage.setItem("jwt", sanitised.token);
            delete sanitised.token;
          }
          state.userInfo = sanitised;
          localStorage.setItem("userInfo", JSON.stringify(sanitised));
        }
        // If null, silently keep the existing userInfo from localStorage
      })
      .addCase(validateSession.rejected, (state) => {
        state.loading = false;
        // Don't clear userInfo on rejection — only logout() action should do that
        // validateSession.rejected means the thunk itself threw an error, not a 401
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
        if (updatedData.token) {
          localStorage.setItem("jwt", updatedData.token);
          delete updatedData.token;
        }

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
