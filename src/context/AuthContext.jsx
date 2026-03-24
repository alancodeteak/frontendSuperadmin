import { useMemo, useState } from 'react'
import { AuthContext } from '@/context/authContextObject'

function isExpiredTimestamp(expiresAt) {
  if (!expiresAt) return true
  const expiresTime = new Date(expiresAt).getTime()
  return Number.isNaN(expiresTime) || expiresTime <= Date.now()
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    accessToken: null,
    tokenType: null,
    expiresAt: null,
    role: null,
  })

  const value = useMemo(() => {
    const isExpired = isExpiredTimestamp(session.expiresAt)
    const isAuthenticated = Boolean(session.accessToken) && !isExpired

    return {
      session,
      isAuthenticated,
      isExpired,
      login: (payload) => {
        setSession({
          accessToken: payload.access_token ?? null,
          tokenType: payload.token_type ?? null,
          expiresAt: payload.expires_at ?? null,
          role: payload.role ?? null,
        })
      },
      logoutLocal: () => {
        setSession({
          accessToken: null,
          tokenType: null,
          expiresAt: null,
          role: null,
        })
      },
      getAuthorizationHeader: () =>
        session.accessToken ? `Bearer ${session.accessToken}` : null,
    }
  }, [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
