import AccountsOverviewPage from '@/pages/accounts/AccountsOverviewPage'

export default function PortalAccountsOverviewPage() {
  return (
    <AccountsOverviewPage
      mode="portal"
      brandTitle="Teamify Portal"
      dashboardPath="/portal/dashboard"
      shopsPath="/portal/dashboard/shops"
      createShopPath="/portal/dashboard/shops/create"
      reportsPath={null}
      invoicesPath="/portal/dashboard/accounts/invoices"
      overviewPath="/portal/dashboard/accounts/overview"
    />
  )
}

