import TeamDashboardPage from '@/pages/dashboard/TeamDashboardPage'

function PortalDashboardPage() {
  return (
    <TeamDashboardPage
      brandTitle="Teamify Portal"
      pageTitle="Portal Dashboard"
      logoutRedirectTo="/portal/login"
      dashboardPath="/portal/dashboard"
      shopsPagePath="/portal/dashboard/shops"
      reportsPath={null}
      contactBookPath="/portal/dashboard/contact-book"
    />
  )
}

export default PortalDashboardPage
