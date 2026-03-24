import ShopListingPage from '@/pages/shops/ShopListingPage'

function AdminShopListingPage() {
  return (
    <ShopListingPage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      pageTitle="Shop Listing"
      caption="Manage and review registered shops"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      logoutRedirectTo="/"
    />
  )
}

export default AdminShopListingPage
