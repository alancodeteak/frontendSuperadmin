import DeliveryPartnersListingPage from '@/pages/deliveryPartners/DeliveryPartnersListingPage'

export default function AdminDeliveryPartnersListingPage() {
  return (
    <DeliveryPartnersListingPage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      shopsCreatePath="/dashboard/teamify/shops/create"
      logoutRedirectTo="/"
    />
  )
}

