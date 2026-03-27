import InvoicesListPage from '@/pages/accounts/InvoicesListPage'

function AdminInvoicesListPage() {
  return (
    <InvoicesListPage
      mode="admin"
      brandTitle="Teamify"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      createShopPath="/dashboard/teamify/shops/create"
      invoicesPath="/dashboard/teamify/accounts/invoices"
      detailPathBase="/dashboard/teamify/accounts/invoices"
      reportsPath="/dashboard/teamify/reports"
      overviewPath="/dashboard/teamify/accounts/overview"
    />
  )
}

export default AdminInvoicesListPage

