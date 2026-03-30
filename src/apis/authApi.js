import { normalizeApiError, requestRaw } from '@/apis/httpClient'

export async function sendOtp({ email, scope }) {
  const response = await requestRaw({
    path: '/login/send-otp',
    method: 'POST',
    body: { email, scope },
    onHttpError: (json) => normalizeApiError(json, 'Request failed. Please try again.'),
  })
  return {
    message: response?.data?.message ?? 'OTP sent successfully',
    code: response?.data?.code ?? 'OTP_SENT',
  }
}

export async function verifyOtp({ email, scope, otp_code: otpCode }) {
  const response = await requestRaw({
    path: '/login/verify-otp',
    method: 'POST',
    body: { email, scope, otp_code: otpCode },
    onHttpError: (json) => normalizeApiError(json, 'Request failed. Please try again.'),
  })

  return response?.data
}

export async function logoutAdmin({ accessToken }) {
  if (!accessToken) {
    return { message: 'Already logged out' }
  }

  return requestRaw({
    path: '/auth/logout',
    method: 'POST',
    accessToken,
    onHttpError: (json) => normalizeApiError(json, 'Request failed. Please try again.'),
  })
}

export async function sendPortalOtp({ email }) {
  return sendOtp({ email, scope: 'portal' })
}

export async function verifyPortalOtp({ email, otp_code: otpCode }) {
  return verifyOtp({ email, scope: 'portal', otp_code: otpCode })
}

export async function logoutPortal({ accessToken }) {
  if (!accessToken) {
    return { message: 'Already logged out' }
  }

  return requestRaw({
    path: '/portal/logout',
    method: 'POST',
    accessToken,
    onHttpError: (json) => normalizeApiError(json, 'Request failed. Please try again.'),
  })
}

export async function logoutByScope({ accessToken, scope }) {
  if (scope === 'portal') {
    return logoutPortal({ accessToken })
  }

  return logoutAdmin({ accessToken })
}
