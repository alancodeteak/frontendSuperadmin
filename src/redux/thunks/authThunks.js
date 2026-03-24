import { createAsyncThunk } from '@reduxjs/toolkit'
import {
  logoutByScope,
  sendOtp,
  sendPortalOtp,
  verifyOtp,
  verifyPortalOtp,
} from '@/apis/authApi'

export const sendOtpAction = createAsyncThunk(
  'auth/sendOtp',
  async ({ scope, email }, { rejectWithValue }) => {
    try {
      return await sendOtp({ scope, email })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const verifyOtpAction = createAsyncThunk(
  'auth/verifyOtp',
  async ({ scope, email, otp_code: otpCode }, { rejectWithValue }) => {
    try {
      return await verifyOtp({ scope, email, otp_code: otpCode })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const sendPortalOtpAction = createAsyncThunk(
  'auth/sendPortalOtp',
  async ({ email }, { rejectWithValue }) => {
    try {
      return await sendPortalOtp({ email })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const verifyPortalOtpAction = createAsyncThunk(
  'auth/verifyPortalOtp',
  async ({ email, otp_code: otpCode }, { rejectWithValue }) => {
    try {
      return await verifyPortalOtp({ email, otp_code: otpCode })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

export const logoutAction = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const accessToken = getState().auth.session.accessToken
      const scope = getState().auth.session.scope
      return await logoutByScope({ accessToken, scope })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)
