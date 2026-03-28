import { configureStore } from '@reduxjs/toolkit'
import dashboardReducer from '@/redux/slices/dashboardSlice'
import authReducer from '@/redux/slices/authSlice'
import supermarketsReducer from '@/redux/slices/supermarketsSlice'
import deliveryPartnersReducer from '@/redux/slices/deliveryPartnersSlice'
import { cacheClearAll } from '@/utils/responseCache'

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
    supermarkets: supermarketsReducer,
    deliveryPartners: deliveryPartnersReducer,
  },
})

let __lastAuthSnapshot = null
let __prevHadAccessToken = Boolean(store.getState().auth.session.accessToken)
store.subscribe(() => {
  const s = store.getState()
  const session = s?.auth?.session ?? {}
  const snapshot = {
    hasAccessToken: Boolean(session.accessToken),
    expiresAt: session.expiresAt ?? null,
    scope: session.scope ?? null,
  }
  if (__prevHadAccessToken && !snapshot.hasAccessToken) {
    cacheClearAll()
  }
  __prevHadAccessToken = snapshot.hasAccessToken

  const changed =
    !__lastAuthSnapshot ||
    __lastAuthSnapshot.hasAccessToken !== snapshot.hasAccessToken ||
    __lastAuthSnapshot.expiresAt !== snapshot.expiresAt ||
    __lastAuthSnapshot.scope !== snapshot.scope

  if (!changed) return
  __lastAuthSnapshot = snapshot
})
