import AccountsOverviewPage from '@/pages/accounts/AccountsOverviewPage'

export default function AdminAccountsOverviewPage() {
  return (
    <AccountsOverviewPage
      mode="admin"
      brandTitle="Teamify"
      dashboardPath="/dashboard/teamify"
      shopsPath="/dashboard/teamify/shops"
      createShopPath="/dashboard/teamify/shops/create"
      reportsPath="/dashboard/teamify/reports"
      invoicesPath="/dashboard/teamify/accounts/invoices"
      overviewPath="/dashboard/teamify/accounts/overview"
    />
  )
}

