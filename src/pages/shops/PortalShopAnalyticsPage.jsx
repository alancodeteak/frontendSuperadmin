import ShopAnalyticsPage from '@/pages/shops/ShopAnalyticsPage'

function PortalShopAnalyticsPage() {
  return (
    <ShopAnalyticsPage
      brandTitle="Teamify Portal"
      sidebarSubTitle="Portal Dashboard"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createPath="/portal/dashboard/shops/create"
      reportsPath={null}
      detailBasePath="/portal/dashboard/shops"
      logoutRedirectTo="/portal/login"
    />
  )
}

export default PortalShopAnalyticsPage
