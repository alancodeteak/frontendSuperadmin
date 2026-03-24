import { createAsyncThunk } from '@reduxjs/toolkit'
import { fetchDashboardData } from '@/apis/dashboardApi'

export const getDashboardData = createAsyncThunk(
  'dashboard/getDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchDashboardData()
    } catch (error) {
      return rejectWithValue(error?.message)
    }
  },
)
