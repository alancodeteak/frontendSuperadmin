import { configureStore } from '@reduxjs/toolkit'
import dashboardReducer from '@/redux/slices/dashboardSlice'
import authReducer from '@/redux/slices/authSlice'
import supermarketsReducer from '@/redux/slices/supermarketsSlice'
import deliveryPartnersReducer from '@/redux/slices/deliveryPartnersSlice'

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
    supermarkets: supermarketsReducer,
    deliveryPartners: deliveryPartnersReducer,
  },
})

let __lastAuthSnapshot = null
store.subscribe(() => {
  const s = store.getState()
  const session = s?.auth?.session ?? {}
  const snapshot = {
    hasAccessToken: Boolean(session.accessToken),
    expiresAt: session.expiresAt ?? null,
    scope: session.scope ?? null,
  }
  const changed =
    !__lastAuthSnapshot ||
    __lastAuthSnapshot.hasAccessToken !== snapshot.hasAccessToken ||
    __lastAuthSnapshot.expiresAt !== snapshot.expiresAt ||
    __lastAuthSnapshot.scope !== snapshot.scope

  if (!changed) return
  __lastAuthSnapshot = snapshot

  // #region agent log
  fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c70081'},body:JSON.stringify({sessionId:'c70081',runId:'auth-refresh-1',hypothesisId:'A1',location:'store.js:subscribe',message:'Auth session snapshot',data:snapshot,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
})
