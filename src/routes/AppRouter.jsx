import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import OtpLoginPage from '@/pages/auth/OtpLoginPage'
import TeamDashboardPage from '@/pages/dashboard/TeamDashboardPage'
import ContactBookPage from '@/pages/home/ContactBookPage'
import PortalLoginPage from '@/pages/portal/PortalLoginPage'
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage'
import AdminShopListingPage from '@/pages/shops/AdminShopListingPage'
import PortalShopListingPage from '@/pages/shops/PortalShopListingPage'
import AdminShopCreatePage from '@/pages/shops/AdminShopCreatePage'
import PortalShopCreatePage from '@/pages/shops/PortalShopCreatePage'
import AdminShopDetailPage from '@/pages/shops/AdminShopDetailPage'
import PortalShopDetailPage from '@/pages/shops/PortalShopDetailPage'
import AdminShopAnalyticsPage from '@/pages/shops/AdminShopAnalyticsPage'
import PortalShopAnalyticsPage from '@/pages/shops/PortalShopAnalyticsPage'
import AdminReportsPage from '@/pages/reports/AdminReportsPage'
import AdminInvoiceDetailPage from '@/pages/accounts/AdminInvoiceDetailPage'
import AdminInvoicesListPage from '@/pages/accounts/AdminInvoicesListPage'
import AdminAccountsOverviewPage from '@/pages/accounts/AdminAccountsOverviewPage'
import DailyActivityPage from '@/pages/activity/DailyActivityPage'
import SalesActivityPage from '@/pages/activity/SalesActivityPage'
import AdminDeliveryPartnersListingPage from '@/pages/deliveryPartners/AdminDeliveryPartnersListingPage'
import AdminDeliveryPartnerDetailPage from '@/pages/deliveryPartners/AdminDeliveryPartnerDetailPage'
import AdminDeliveryPartnerAnalyticsPage from '@/pages/deliveryPartners/AdminDeliveryPartnerAnalyticsPage'
import PortalInvoiceDetailPage from '@/pages/accounts/PortalInvoiceDetailPage'
import PortalInvoicesListPage from '@/pages/accounts/PortalInvoicesListPage'
import PortalAccountsOverviewPage from '@/pages/accounts/PortalAccountsOverviewPage'
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
          path="/dashboard/teamify/contact-book"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <ContactBookPage />
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
          path="/dashboard/teamify/shops/:userId/analytics"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminShopAnalyticsPage />
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
        <Route
          path="/dashboard/teamify/delivery-partners/:deliveryPartnerId"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminDeliveryPartnerDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/delivery-partners/:deliveryPartnerId/analytics"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminDeliveryPartnerAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/reports"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/activity/daily/*"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <DailyActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/activity/sales/*"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <SalesActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/accounts/invoices"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminInvoicesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/accounts/overview"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminAccountsOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teamify/accounts/invoices/:invoiceId"
          element={
            <ProtectedRoute requiredScope="admin" redirectTo="/">
              <AdminInvoiceDetailPage />
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
          path="/portal/dashboard/shops/:userId/analytics"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalShopAnalyticsPage />
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
        <Route
          path="/portal/dashboard/accounts/invoices"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalInvoicesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/dashboard/accounts/overview"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalAccountsOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/dashboard/accounts/invoices/:invoiceId"
          element={
            <ProtectedRoute requiredScope="portal" redirectTo="/portal/login">
              <PortalInvoiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
