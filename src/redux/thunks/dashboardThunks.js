import { createAsyncThunk } from '@reduxjs/toolkit'
import { fetchDashboardData } from '@/apis/dashboardApi'

export const getDashboardData = createAsyncThunk(
  'dashboard/getDashboardData',
  async (args, { getState, rejectWithValue }) => {
    try {
      const state = getState()
      const accessToken = state?.auth?.session?.accessToken ?? null
      const range = state?.dashboard?.selectedRange ?? 'weekly'
      const mode = args?.mode ?? 'admin'
      return await fetchDashboardData({ accessToken, range, mode })
    } catch (error) {
      return rejectWithValue(error?.message)
    }
  },
)
