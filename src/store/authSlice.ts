import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    isPremium: boolean;
    credits: number;
  } | null;
}

const initialState: AuthState = (() => {
  // ✅ Load from localStorage on first run
  const storedAuth = localStorage.getItem("auth");
  return storedAuth ? JSON.parse(storedAuth) : { token: null, user: null };
})();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{ token: string; user: AuthState["user"] }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      // ✅ Persist to localStorage
      localStorage.setItem("auth", JSON.stringify(state));
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      // ✅ Remove from localStorage on logout
      localStorage.removeItem("auth");
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
