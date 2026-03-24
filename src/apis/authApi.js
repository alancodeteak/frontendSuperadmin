const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

function normalizeApiError(payload, fallbackMessage) {
  if (payload?.error) {
    return {
      code: payload.error.code ?? 'INTERNAL_SERVER_ERROR',
      message: payload.error.message ?? fallbackMessage,
      requestId: payload.error.request_id ?? null,
      details: payload.error.details ?? null,
    }
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    requestId: null,
    details: null,
  }
}

async function request(path, body) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    throw normalizeApiError(json, 'Request failed. Please try again.')
  }

  return json
}

async function requestWithAuth(path, token) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    throw normalizeApiError(json, 'Request failed. Please try again.')
  }

  return json
}

export async function sendOtp({ email, scope }) {
  const response = await request('/login/send-otp', { email, scope })
  return {
    message: response?.data?.message ?? 'OTP sent successfully',
    code: response?.data?.code ?? 'OTP_SENT',
  }
}

export async function verifyOtp({ email, scope, otp_code: otpCode }) {
  const response = await request('/login/verify-otp', {
    email,
    scope,
    otp_code: otpCode,
  })

  return response?.data
}

export async function logoutAdmin({ accessToken }) {
  if (!accessToken) {
    return { message: 'Already logged out' }
  }

  return requestWithAuth('/auth/logout', accessToken)
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

  return requestWithAuth('/portal/logout', accessToken)
}

export async function logoutByScope({ accessToken, scope }) {
  if (scope === 'portal') {
    return logoutPortal({ accessToken })
  }

  return logoutAdmin({ accessToken })
}
