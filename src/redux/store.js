import { configureStore } from '@reduxjs/toolkit'
import dashboardReducer from '@/redux/slices/dashboardSlice'
import authReducer from '@/redux/slices/authSlice'

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
  },
})
