/** Builds the admin dashboard "Operations" snapshot from analytics + accounts APIs. */
export function buildOperationsSnapshot(ov, funnel, dpRows, acct) {
  if (!ov) return null
  const kpis = ov.kpis ?? {}
  const per = Array.isArray(ov.revenue?.per_shop) ? ov.revenue.per_shop : []
  const activeShops = Number(kpis.active_shops ?? 0)
  const activePartners = Number(kpis.active_partners ?? 0)
  const partnersWithOrders = Array.isArray(dpRows) ? dpRows.length : 0
  const pendingShops = Number(acct?.kpis?.pending_shops ?? 0)
  const overdueShops = Number(acct?.kpis?.overdue_shops ?? 0)
  return {
    kind: 'admin',
    shopsNotUsing: Math.max(0, activeShops - per.length),
    shopsPaymentPending: acct ? pendingShops + overdueShops : null,
    partnersNotUsing: Array.isArray(dpRows) ? Math.max(0, activePartners - partnersWithOrders) : null,
    deliveriesPending: funnel != null ? Number(funnel.pending ?? 0) : null,
    partnerSampleCapped: partnersWithOrders >= 100 && activePartners > 100,
    totalOrders: Number(kpis.total_orders ?? 0),
    totalAmount: Number(kpis.total_amount ?? 0),
    totalDeliveries: Number(kpis.total_deliveries ?? 0),
    growth: ov.growth ?? null,
  }
}
