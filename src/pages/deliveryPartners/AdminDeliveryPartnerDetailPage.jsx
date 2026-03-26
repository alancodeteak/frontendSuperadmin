import DeliveryPartnerDetailPage from '@/pages/deliveryPartners/DeliveryPartnerDetailPage'

export default function AdminDeliveryPartnerDetailPage() {
  return (
    <DeliveryPartnerDetailPage
      brandTitle="Teamify"
      sidebarSubTitle="Team Dashboard"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      shopsCreatePath="/dashboard/teamify/shops/create"
      listingPath="/dashboard/teamify/delivery-partners"
      logoutRedirectTo="/"
    />
  )
}

