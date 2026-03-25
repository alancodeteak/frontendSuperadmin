import ShopListingPage from '@/pages/shops/ShopListingPage'

function PortalShopListingPage() {
  return (
    <ShopListingPage
      brandTitle="Teamify Portal"
      sidebarSubTitle="Portal Dashboard"
      pageTitle="Portal Shop Listing"
      caption="Review shop profiles registered in the portal"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createPath="/portal/dashboard/shops/create"
      logoutRedirectTo="/portal/login"
    />
  )
}

export default PortalShopListingPage
