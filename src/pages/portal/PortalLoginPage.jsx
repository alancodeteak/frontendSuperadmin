import OtpLoginPage from '@/pages/auth/OtpLoginPage'
import {
  sendPortalOtpAction,
  verifyPortalOtpAction,
} from '@/redux/thunks/authThunks'

function PortalLoginPage() {
  return (
    <OtpLoginPage
      scope="portal"
      loginSuccessPath="/portal/dashboard"
      brandLabel="Teamify Portal"
      sendOtpThunk={sendPortalOtpAction}
      verifyOtpThunk={verifyPortalOtpAction}
    />
  )
}

export default PortalLoginPage
