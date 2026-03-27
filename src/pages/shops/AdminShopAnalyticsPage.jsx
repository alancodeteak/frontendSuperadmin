import ShopAnalyticsPage from '@/pages/shops/ShopAnalyticsPage'

function AdminShopAnalyticsPage() {
  return (
    <ShopAnalyticsPage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      createPath="/dashboard/teamify/shops/create"
      detailBasePath="/dashboard/teamify/shops"
      logoutRedirectTo="/"
    />
  )
}

export default AdminShopAnalyticsPage
