import ShopCreatePage from '@/pages/shops/ShopCreatePage'

function AdminShopCreatePage() {
  return (
    <ShopCreatePage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      listingPath="/dashboard/teamify/shops"
      createPath="/dashboard/teamify/shops/create"
      logoutRedirectTo="/"
    />
  )
}

export default AdminShopCreatePage

