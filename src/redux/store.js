import { configureStore } from '@reduxjs/toolkit'
import dashboardReducer from '@/redux/slices/dashboardSlice'
import authReducer from '@/redux/slices/authSlice'
import supermarketsReducer from '@/redux/slices/supermarketsSlice'

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
    supermarkets: supermarketsReducer,
  },
})
