export function buildSidebarNav({ navigate, activeKey, paths }) {
  const {
    dashboardPath,
    homeContactBookPath,
    shopsPath,
    createShopPath,
    deliveryPartnersPath,
    reportsPath,
    accountsInvoicesPath,
    accountsOverviewPath,
    activityDailyPath,
    activitySalesPath,
    settingsPath,
  } = paths ?? {}

  const isActive = (key) => key && activeKey === key

  const comingSoon = (id, label) => ({
    id,
    label,
    disabled: true,
    disabledReason: 'Coming soon',
  })

  const showPartners = Boolean(deliveryPartnersPath)
  const showActivity = Boolean(activityDailyPath || activitySalesPath)
  const resolvedSettingsPath =
    settingsPath ??
    (dashboardPath && String(dashboardPath).startsWith('/portal')
      ? '/portal/dashboard/settings'
      : '/dashboard/teamify/settings')

  const mainNavItems = [
    {
      id: 'home',
      label: 'Home',
      iconName: 'home',
      children: [
        {
          id: 'home-dashboard',
          label: 'Dashboard',
          iconName: 'home',
          active: isActive('home.dashboard'),
          onClick: dashboardPath ? () => navigate(dashboardPath) : undefined,
          disabled: !dashboardPath,
          disabledReason: dashboardPath ? undefined : 'Missing route',
        },
        homeContactBookPath
          ? {
              id: 'home-contact-book',
              label: 'Contact Book',
              iconName: 'users',
              active: isActive('home.contactBook'),
              onClick: () => navigate(homeContactBookPath),
            }
          : comingSoon('home-contact-book', 'Contact Book'),
      ],
    },
    {
      id: 'shops',
      label: 'Shops',
      iconName: 'store',
      children: [
        {
          id: 'shops-view',
          label: 'View Shops',
          iconName: 'store',
          active: isActive('shops.view'),
          onClick: shopsPath ? () => navigate(shopsPath) : undefined,
          disabled: !shopsPath,
          disabledReason: shopsPath ? undefined : 'Missing route',
        },
        {
          id: 'shops-create',
          label: 'Create Shop',
          iconName: 'plus',
          active: isActive('shops.create'),
          onClick: createShopPath ? () => navigate(createShopPath) : undefined,
          disabled: !createShopPath,
          disabledReason: createShopPath ? undefined : 'Missing route',
        },
      ],
    },
    ...(showPartners
      ? [
          {
            id: 'partners',
            label: 'Partners',
            iconName: 'users',
            children: [
              {
                id: 'partners-delivery-partners',
                label: 'Delivery Partners',
                iconName: 'users',
                active: isActive('partners.deliveryPartners'),
                onClick: () => navigate(deliveryPartnersPath),
              },
            ],
          },
        ]
      : []),
    ...(reportsPath === null
      ? []
      : [
          {
            id: 'reports',
            label: 'Reports',
            iconName: 'report',
            children: [
              reportsPath
                ? {
                    id: 'reports-main',
                    label: 'Reports',
                    iconName: 'report',
                    active: isActive('reports.main'),
                    onClick: () => navigate(reportsPath),
                  }
                : comingSoon('reports-main', 'Reports'),
            ],
          },
        ]),
    {
      id: 'accounts',
      label: 'Accounts',
      iconName: 'wallet',
      children: [
        accountsInvoicesPath
          ? {
              id: 'accounts-invoices',
              label: 'Invoices',
              iconName: 'wallet',
              active: isActive('accounts.invoices'),
              onClick: () => navigate(accountsInvoicesPath),
            }
          : comingSoon('accounts-invoices', 'Invoices'),
        accountsInvoicesPath
          ? {
              id: 'accounts-billing',
              label: 'Billing',
              iconName: 'wallet',
              active: isActive('accounts.billing'),
              onClick: () => navigate(`${accountsInvoicesPath}?document_type=BILL`),
            }
          : comingSoon('accounts-billing', 'Billing'),
        accountsOverviewPath
          ? {
              id: 'accounts-overview',
              label: 'Overview',
              iconName: 'wallet',
              active: isActive('accounts.overview'),
              onClick: () => navigate(accountsOverviewPath),
            }
          : comingSoon('accounts-overview', 'Overview'),
      ],
    },
    ...(showActivity
      ? [
          {
            id: 'activity',
            label: 'Activity',
            iconName: 'activity',
            children: [
              activityDailyPath
                ? {
                    id: 'activity-daily',
                    label: 'Daily',
                    iconName: 'activity',
                    active: isActive('activity.daily'),
                    onClick: () => navigate(activityDailyPath),
                  }
                : comingSoon('activity-daily', 'Daily'),
              activitySalesPath
                ? {
                    id: 'activity-sales',
                    label: 'Sales',
                    iconName: 'activity',
                    active: isActive('activity.sales'),
                    onClick: () => navigate(activitySalesPath),
                  }
                : comingSoon('activity-sales', 'Sales'),
              comingSoon('activity-activity', 'Activity'),
            ],
          },
        ]
      : []),
    {
      id: 'settings',
      label: 'Settings',
      iconName: 'settings',
      children: [
        resolvedSettingsPath
          ? {
              id: 'settings-main',
              label: 'General settings',
              iconName: 'settings',
              active: isActive('settings.main'),
              onClick: () => navigate(resolvedSettingsPath),
            }
          : comingSoon('settings-main', 'Settings'),
      ],
    },
  ]

  const baseSections = [
    {
      id: 'main',
      title: null,
      items: mainNavItems,
    },
  ]
  return baseSections
}

