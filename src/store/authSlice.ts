import { createSlice } from "@reduxjs/toolkit";

export interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    isPremium: boolean;
    credits: number;
  } | null;
}

const initialState: AuthState = { token: null, user: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
