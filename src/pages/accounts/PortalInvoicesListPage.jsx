import InvoicesListPage from '@/pages/accounts/InvoicesListPage'

function PortalInvoicesListPage() {
  return (
    <InvoicesListPage
      mode="portal"
      brandTitle="Teamify Portal"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createShopPath="/portal/dashboard/shops/create"
      invoicesPath="/portal/dashboard/accounts/invoices"
      detailPathBase="/portal/dashboard/accounts/invoices"
      reportsPath={null}
      overviewPath="/portal/dashboard/accounts/overview"
    />
  )
}

export default PortalInvoicesListPage

