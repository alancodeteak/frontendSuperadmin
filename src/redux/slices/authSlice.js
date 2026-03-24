import { createSlice } from '@reduxjs/toolkit'
import {
  logoutAction,
  sendPortalOtpAction,
  sendOtpAction,
  verifyPortalOtpAction,
  verifyOtpAction,
} from '@/redux/thunks/authThunks'

function isExpiredTimestamp(expiresAt) {
  if (!expiresAt) return true
  const expiresTime = new Date(expiresAt).getTime()
  return Number.isNaN(expiresTime) || expiresTime <= Date.now()
}

const initialState = {
  session: {
    accessToken: null,
    tokenType: null,
    expiresAt: null,
    role: null,
    scope: null,
  },
  sendOtpStatus: 'idle',
  verifyOtpStatus: 'idle',
  logoutStatus: 'idle',
  statusMessage: '',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutLocal(state) {
      state.session = {
        accessToken: null,
        tokenType: null,
        expiresAt: null,
        role: null,
        scope: null,
      }
      state.verifyOtpStatus = 'idle'
      state.sendOtpStatus = 'idle'
      state.logoutStatus = 'idle'
      state.statusMessage = ''
      state.error = null
    },
    clearAuthError(state) {
      state.error = null
    },
    clearStatusMessage(state) {
      state.statusMessage = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtpAction.pending, (state) => {
        state.sendOtpStatus = 'loading'
        state.error = null
      })
      .addCase(sendOtpAction.fulfilled, (state, action) => {
        state.sendOtpStatus = 'succeeded'
        state.statusMessage = action.payload?.message ?? 'OTP sent successfully'
      })
      .addCase(sendOtpAction.rejected, (state, action) => {
        state.sendOtpStatus = 'failed'
        state.error = action.payload ?? {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send OTP',
        }
      })
      .addCase(sendPortalOtpAction.pending, (state) => {
        state.sendOtpStatus = 'loading'
        state.error = null
      })
      .addCase(sendPortalOtpAction.fulfilled, (state, action) => {
        state.sendOtpStatus = 'succeeded'
        state.statusMessage = action.payload?.message ?? 'OTP sent successfully'
      })
      .addCase(sendPortalOtpAction.rejected, (state, action) => {
        state.sendOtpStatus = 'failed'
        state.error = action.payload ?? {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send OTP',
        }
      })
      .addCase(verifyOtpAction.pending, (state) => {
        state.verifyOtpStatus = 'loading'
        state.error = null
      })
      .addCase(verifyOtpAction.fulfilled, (state, action) => {
        state.verifyOtpStatus = 'succeeded'
        state.session = {
          accessToken: action.payload?.access_token ?? null,
          tokenType: action.payload?.token_type ?? null,
          expiresAt: action.payload?.expires_at ?? null,
          role: action.payload?.role ?? null,
          scope: action.meta.arg.scope ?? 'admin',
        }
      })
      .addCase(verifyOtpAction.rejected, (state, action) => {
        state.verifyOtpStatus = 'failed'
        state.error = action.payload ?? {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify OTP',
        }
      })
      .addCase(verifyPortalOtpAction.pending, (state) => {
        state.verifyOtpStatus = 'loading'
        state.error = null
      })
      .addCase(verifyPortalOtpAction.fulfilled, (state, action) => {
        state.verifyOtpStatus = 'succeeded'
        state.session = {
          accessToken: action.payload?.access_token ?? null,
          tokenType: action.payload?.token_type ?? null,
          expiresAt: action.payload?.expires_at ?? null,
          role: action.payload?.role ?? null,
          scope: 'portal',
        }
      })
      .addCase(verifyPortalOtpAction.rejected, (state, action) => {
        state.verifyOtpStatus = 'failed'
        state.error = action.payload ?? {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify OTP',
        }
      })
      .addCase(logoutAction.pending, (state) => {
        state.logoutStatus = 'loading'
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.logoutStatus = 'succeeded'
      })
      .addCase(logoutAction.rejected, (state, action) => {
        state.logoutStatus = 'failed'
        state.error = action.payload ?? {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout session cleanly',
        }
      })
  },
})

export const { logoutLocal, clearAuthError, clearStatusMessage } =
  authSlice.actions

export const selectAuthSession = (state) => state.auth.session
export const selectAuthScope = (state) => state.auth.session.scope
export const selectIsExpired = (state) =>
  isExpiredTimestamp(state.auth.session.expiresAt)
export const selectIsAuthenticated = (state) =>
  Boolean(state.auth.session.accessToken) && !isExpiredTimestamp(state.auth.session.expiresAt)

export default authSlice.reducer
