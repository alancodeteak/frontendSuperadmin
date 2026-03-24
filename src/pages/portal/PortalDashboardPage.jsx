import TeamDashboardPage from '@/pages/dashboard/TeamDashboardPage'

function PortalDashboardPage() {
  return (
    <TeamDashboardPage
      brandTitle="Teamify Portal"
      pageTitle="Portal Dashboard"
      logoutRedirectTo="/portal/login"
      shopsPagePath="/portal/dashboard/shops"
    />
  )
}

export default PortalDashboardPage
