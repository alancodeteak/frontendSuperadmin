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

const STORAGE_KEY = 'yaadro_auth_session_v1'

function resolveSessionStorage() {
  // local: persists across browser restarts (highest XSS blast radius)
  // session: clears on tab/window close (lower persistence)
  // none: do not persist to Web Storage at all (in-memory only)
  const mode = String(import.meta.env.VITE_AUTH_STORAGE ?? 'local').toLowerCase()
  if (typeof window === 'undefined') return null
  if (mode === 'none') return null
  if (mode === 'session') return window.sessionStorage
  return window.localStorage
}

function loadSessionFromStorage() {
  try {
    const storage = resolveSessionStorage()
    if (!storage) return null
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const session = {
      accessToken: parsed.accessToken ?? null,
      tokenType: parsed.tokenType ?? null,
      expiresAt: parsed.expiresAt ?? null,
      role: parsed.role ?? null,
      scope: parsed.scope ?? null,
    }
    if (!session.accessToken) return null
    if (isExpiredTimestamp(session.expiresAt)) return null
    return session
  } catch {
    return null
  }
}

function persistSessionToStorage(session) {
  try {
    const storage = resolveSessionStorage()
    if (!storage) return
    if (!session?.accessToken) {
      storage.removeItem(STORAGE_KEY)
      return
    }
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        expiresAt: session.expiresAt,
        role: session.role,
        scope: session.scope,
      }),
    )
  } catch {
    // ignore storage failures (private mode, quota, etc)
  }
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
  initialState: (() => {
    const stored = typeof window !== 'undefined' ? loadSessionFromStorage() : null
    return stored ? { ...initialState, session: stored } : initialState
  })(),
  reducers: {
    logoutLocal(state) {
      state.session = {
        accessToken: null,
        tokenType: null,
        expiresAt: null,
        role: null,
        scope: null,
      }
      if (typeof window !== 'undefined') {
        persistSessionToStorage(null)
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
        if (typeof window !== 'undefined') {
          persistSessionToStorage(state.session)
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
        if (typeof window !== 'undefined') {
          persistSessionToStorage(state.session)
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
