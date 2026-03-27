import ShopCreatePage from '@/pages/shops/ShopCreatePage'

function PortalShopCreatePage() {
  return (
    <ShopCreatePage
      brandTitle="Teamify Portal"
      sidebarSubTitle="Portal Dashboard"
      listingPath="/portal/dashboard/shops"
      createPath="/portal/dashboard/shops/create"
      reportsPath={null}
      logoutRedirectTo="/portal/login"
    />
  )
}

export default PortalShopCreatePage

