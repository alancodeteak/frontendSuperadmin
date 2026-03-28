export function buildTeamifyAdminSidebarPaths({
  dashboardPath = '/dashboard/teamify',
  shopsPath = '/dashboard/teamify/shops',
  createShopPath = '/dashboard/teamify/shops/create',
  reportsPath = '/dashboard/teamify/reports',
  includeAccounts = true,
  includeActivity = true,
  includeContactBook = true,
} = {}) {
  const isPortalLike = reportsPath === null

  return {
    dashboardPath,
    homeContactBookPath: includeContactBook && !isPortalLike ? '/dashboard/teamify/contact-book' : null,
    shopsPath,
    createShopPath,
    deliveryPartnersPath: !isPortalLike ? '/dashboard/teamify/delivery-partners' : null,
    reportsPath: isPortalLike ? null : reportsPath,
    accountsInvoicesPath: includeAccounts
      ? isPortalLike
        ? '/portal/dashboard/accounts/invoices'
        : '/dashboard/teamify/accounts/invoices'
      : null,
    accountsOverviewPath: includeAccounts
      ? isPortalLike
        ? '/portal/dashboard/accounts/overview'
        : '/dashboard/teamify/accounts/overview'
      : null,
    activityDailyPath: includeActivity && !isPortalLike ? '/dashboard/teamify/activity/daily' : null,
    activitySalesPath: includeActivity && !isPortalLike ? '/dashboard/teamify/activity/sales' : null,
  }
}

