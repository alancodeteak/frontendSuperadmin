import InvoiceDetailPage from '@/pages/accounts/InvoiceDetailPage'

function PortalInvoiceDetailPage() {
  return (
    <InvoiceDetailPage
      mode="portal"
      brandTitle="Teamify Portal"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createShopPath="/portal/dashboard/shops/create"
      invoicesPath="/portal/dashboard/accounts/invoices"
      reportsPath={null}
      overviewPath="/portal/dashboard/accounts/overview"
    />
  )
}

export default PortalInvoiceDetailPage

