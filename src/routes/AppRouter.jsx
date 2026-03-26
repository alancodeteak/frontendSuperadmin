import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import OtpLoginPage from '@/pages/auth/OtpLoginPage'
import TeamDashboardPage from '@/pages/dashboard/TeamDashboardPage'
import PortalLoginPage from '@/pages/portal/PortalLoginPage'
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage'
import AdminShopListingPage from '@/pages/shops/AdminShopListingPage'
import PortalShopListingPage from '@/pages/shops/PortalShopListingPage'
import AdminShopCreatePage from '@/pages/shops/AdminShopCreatePage'
import PortalShopCreatePage from '@/pages/shops/PortalShopCreatePage'
import AdminShopDetailPage from '@/pages/shops/AdminShopDetailPage'
import PortalShopDetailPage from '@/pages/shops/PortalShopDetailPage'
import AdminDeliveryPartnersListingPage from '@/pages/deliveryPartners/AdminDeliveryPartnersListingPage'
import {
  selectAuthScope,
  selectIsAuthenticated,
} from '@/redux/slices/authSlice'

function ProtectedRoute({ children, requiredScope, redirectTo }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const authScope = useSelector(selectAuthScope)
  const shouldRedirect = !isAuthenticated || authScope !== requiredScope

  if (shouldRedirect) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OtpLoginPage />} />
        <Route
          path="/dashboard/teamify"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <TeamDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/shops"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminShopListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/shops/:userId"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminShopDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/shops/create"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminShopCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/delivery-partners"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminDeliveryPartnersListingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route
          path="/portal/dashboard"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/dashboard/shops"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalShopListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/dashboard/shops/:userId"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalShopDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/dashboard/shops/create"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalShopCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
