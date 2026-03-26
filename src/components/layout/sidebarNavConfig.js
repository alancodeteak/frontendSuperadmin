export function buildSidebarNav({ navigate, activeKey, paths }) {
  const {
    dashboardPath,
    shopsPath,
    createShopPath,
    deliveryPartnersPath,
  } = paths ?? {}

  const isActive = (key) => key && activeKey === key

  const comingSoon = (id, label) => ({
    id,
    label,
    disabled: true,
    disabledReason: 'Coming soon',
  })

  return [
    {
      id: 'main',
      title: null,
      items: [
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
              onClick: deliveryPartnersPath ? () => navigate(deliveryPartnersPath) : undefined,
              disabled: !deliveryPartnersPath,
              disabledReason: deliveryPartnersPath ? undefined : 'Missing route',
            },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          iconName: 'report',
          children: [comingSoon('reports-main', 'Reports')],
        },
        {
          id: 'accounts',
          label: 'Accounts',
          iconName: 'wallet',
          children: [
            comingSoon('accounts-invoices', 'Invoices'),
            comingSoon('accounts-billing', 'Billing'),
            comingSoon('accounts-overview', 'Overview'),
          ],
        },
        {
          id: 'activity',
          label: 'Activity',
          iconName: 'activity',
          children: [
            comingSoon('activity-daily', 'Daily'),
            comingSoon('activity-activity', 'Activity'),
          ],
        },
        {
          id: 'settings',
          label: 'Settings',
          iconName: 'settings',
          children: [comingSoon('settings-main', 'Settings')],
        },
      ],
    },
  ]
}

