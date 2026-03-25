import ShopDetailPage from '@/pages/shops/ShopDetailPage'

function AdminShopDetailPage() {
  return (
    <ShopDetailPage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      createPath="/dashboard/teamify/shops/create"
      logoutRedirectTo="/"
    />
  )
}

export default AdminShopDetailPage

