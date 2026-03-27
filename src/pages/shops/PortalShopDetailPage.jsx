import ShopDetailPage from '@/pages/shops/ShopDetailPage'

function PortalShopDetailPage() {
  return (
    <ShopDetailPage
      brandTitle="Teamify Portal"
      sidebarSubTitle="Portal Dashboard"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createPath="/portal/dashboard/shops/create"
      reportsPath={null}
      logoutRedirectTo="/portal/login"
    />
  )
}

export default PortalShopDetailPage

