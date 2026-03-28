import ContactBookPage from '@/pages/home/ContactBookPage'

function PortalContactBookPage() {
  return (
    <ContactBookPage
      brandTitle="Teamify Portal"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createShopPath="/portal/dashboard/shops/create"
      reportsPath={null}
      invoicesPath="/portal/dashboard/accounts/invoices"
      overviewPath="/portal/dashboard/accounts/overview"
      contactBookPath="/portal/dashboard/contact-book"
      deliveryPartnersPath={null}
      activityDailyPath={null}
      activitySalesPath={null}
      logoutRedirectTo="/portal/login"
    />
  )
}

export default PortalContactBookPage
