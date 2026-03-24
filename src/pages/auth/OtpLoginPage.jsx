import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearAuthError,
  clearStatusMessage,
} from '@/redux/slices/authSlice'
import {
  sendOtpAction,
  verifyOtpAction,
} from '@/redux/thunks/authThunks'
import './OtpLoginPage.css'

const RESEND_SECONDS = 30
const OTP_LENGTH = 6
const DEFAULT_ADMIN_EMAIL =
  import.meta.env.VITE_LOGIN_EMAIL ?? 'yaadro@codeteak.com'
const DEFAULT_PORTAL_EMAIL =
  import.meta.env.VITE_PORTAL_LOGIN_EMAIL ?? DEFAULT_ADMIN_EMAIL

function getFriendlyErrorMessage(errorCode, fallbackMessage) {
  const messages = {
    OTP_INVALID: 'The OTP code is invalid. Please re-check and try again.',
    OTP_EXPIRED: 'Your OTP has expired. Please request a new OTP.',
    OTP_ATTEMPTS_EXCEEDED:
      'Too many incorrect attempts. Please request a new OTP.',
    OTP_RATE_LIMITED:
      'Too many requests in a short time. Please wait and try again.',
    OTP_DELIVERY_FAILED:
      'Unable to deliver OTP right now. Please try again in a moment.',
    VALIDATION_ERROR: 'Invalid request. Please try again.',
    REQUEST_VALIDATION_ERROR: 'Invalid request data. Please try again.',
    INTERNAL_SERVER_ERROR:
      'Something went wrong on the server. Please try again.',
  }

  return messages[errorCode] ?? fallbackMessage ?? 'Request failed.'
}

function OtpLoginPage({
  scope = 'admin',
  email,
  loginSuccessPath = '/dashboard/teamify',
  brandLabel = 'Teamify',
  sendOtpThunk = sendOtpAction,
  verifyOtpThunk = verifyOtpAction,
}) {
  const navigate = useNavigate()
  const loginEmail =
    email ?? (scope === 'portal' ? DEFAULT_PORTAL_EMAIL : DEFAULT_ADMIN_EMAIL)

  const dispatch = useDispatch()
  const { sendOtpStatus, verifyOtpStatus, error, statusMessage } = useSelector(
    (state) => state.auth,
  )
  const [otpSent, setOtpSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [otpDigits, setOtpDigits] = useState(() => Array(OTP_LENGTH).fill(''))
  const otpInputRefs = useRef([])
  const isSubmitting =
    sendOtpStatus === 'loading' || verifyOtpStatus === 'loading'
  const isLoggingIn = verifyOtpStatus === 'loading'
  const errorMessage = error
    ? getFriendlyErrorMessage(error?.code, error?.message)
    : ''

  useEffect(() => {
    if (!secondsLeft) return undefined
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const resendLabel = useMemo(() => {
    if (!otpSent) return 'Resend OTP'
    if (secondsLeft > 0) return `Resend OTP in ${secondsLeft}s`
    return 'Resend OTP'
  }, [otpSent, secondsLeft])
  const otpCode = otpDigits.join('')

  const focusFirstOtpField = () => {
    setTimeout(() => {
      otpInputRefs.current[0]?.focus()
    }, 0)
  }

  const handleSendOtp = async () => {
    dispatch(clearAuthError())
    dispatch(clearStatusMessage())

    const result = await dispatch(
      sendOtpThunk({
        scope,
        email: loginEmail,
      }),
    )

    if (sendOtpThunk.fulfilled.match(result)) {
      setOtpSent(true)
      setSecondsLeft(RESEND_SECONDS)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      focusFirstOtpField()
    }
  }

  const handleResend = async () => {
    if (!otpSent || secondsLeft > 0) return

    dispatch(clearAuthError())
    dispatch(clearStatusMessage())

    const result = await dispatch(
      sendOtpThunk({
        scope,
        email: loginEmail,
      }),
    )

    if (sendOtpThunk.fulfilled.match(result)) {
      setSecondsLeft(RESEND_SECONDS)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      focusFirstOtpField()
    }
  }

  const handleOtpDigitChange = (index, value) => {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    const nextDigits = [...otpDigits]
    nextDigits[index] = nextValue
    setOtpDigits(nextDigits)

    if (nextValue && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
    if (!pasted) return

    const nextDigits = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((char, index) => {
      nextDigits[index] = char
    })
    setOtpDigits(nextDigits)
    const lastIndex = Math.min(pasted.length, OTP_LENGTH) - 1
    otpInputRefs.current[Math.max(lastIndex, 0)]?.focus()
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length !== OTP_LENGTH) return

    dispatch(clearAuthError())

    const result = await dispatch(
      verifyOtpThunk({
        scope,
        email: loginEmail,
        otp_code: otpCode,
      }),
    )

    if (verifyOtpThunk.fulfilled.match(result)) {
      navigate(loginSuccessPath, { replace: true })
    }
  }

  return (
    <main className="otp-login-page">
      <div className="otp-logo-wrap">
        <div className="otp-logo">YD</div>
        <p className="otp-logo-caption">{brandLabel}</p>
      </div>

      <section className="otp-card">
        <h1>{otpSent ? 'Enter OTP' : 'Log in'}</h1>

        <p className="otp-helper">
          {otpSent
            ? 'Enter the 6-digit code sent to your registered email.'
            : 'Click below to send OTP to your registered email.'}
        </p>

        {statusMessage && !errorMessage && otpSent && (
          <p className="otp-status-message">{statusMessage}</p>
        )}
        {isLoggingIn && !errorMessage && (
          <p className="otp-welcome-message">
            Welcome back! Logging you in...
          </p>
        )}
        {errorMessage && <p className="otp-error-message">{errorMessage}</p>}

        <button
          type="button"
          className="otp-send-btn"
          onClick={handleSendOtp}
          disabled={otpSent || isSubmitting}
        >
          {isSubmitting && !otpSent ? 'Sending OTP...' : 'Send OTP'}
        </button>

        {otpSent && (
          <>
            <div className="otp-code-row" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={`otp-${index}`}
                  ref={(element) => {
                    otpInputRefs.current[index] = element
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className="otp-code-box"
                  value={digit}
                  onChange={(event) =>
                    handleOtpDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="otp-verify-btn"
              disabled={otpCode.length !== OTP_LENGTH || isSubmitting}
              onClick={handleVerifyOtp}
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
          </>
        )}

        <button
          type="button"
          className="otp-resend-btn"
          onClick={handleResend}
          disabled={!otpSent || secondsLeft > 0 || isSubmitting}
        >
          {resendLabel}
        </button>

        <p className="otp-powered">Powered by</p>
        <p className="otp-brand">Codeteak</p>
      </section>
    </main>
  )
}

export default OtpLoginPage
