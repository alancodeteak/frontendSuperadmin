import { createSlice } from '@reduxjs/toolkit'
import { getDashboardData } from '@/redux/thunks/dashboardThunks'

const initialState = {
  loading: false,
  error: null,
  stats: [],
  members: [],
  performanceSeries: [],
  activeTab: 'overview',
  selectedRange: 'weekly',
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload
    },
    setSelectedRange(state, action) {
      state.selectedRange = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDashboardData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(getDashboardData.fulfilled, (state, action) => {
        state.loading = false
        state.stats = action.payload.stats
        state.members = action.payload.members
        state.performanceSeries = action.payload.performanceSeries ?? []
      })
      .addCase(getDashboardData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Failed to load dashboard data'
      })
  },
})

export const { setActiveTab, setSelectedRange } = dashboardSlice.actions
export default dashboardSlice.reducer
