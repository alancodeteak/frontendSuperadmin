/**
 * Subscription invoice status rules — kept in sync with backend:
 * - app/infrastructure/db/models/enums.py → InvoiceStatus
 * - app/services/invoice_service.py → _ensure_valid_transition, update_status
 */

/** @readonly */
export const INVOICE_STATUS_VALUES = Object.freeze([
  'PENDING',
  'ISSUED',
  'PAID',
  'FAILED',
  'OVERDUE',
  'VOID',
])

/**
 * Allowed next statuses from current (matches InvoiceService._ensure_valid_transition).
 * @readonly
 */
export const INVOICE_STATUS_TRANSITIONS = Object.freeze({
  ISSUED: Object.freeze(['PENDING', 'PAID', 'VOID', 'FAILED']),
  PENDING: Object.freeze(['PAID', 'OVERDUE', 'VOID', 'FAILED']),
  OVERDUE: Object.freeze(['PAID', 'VOID']),
  FAILED: Object.freeze(['ISSUED', 'PENDING', 'VOID']),
  PAID: Object.freeze(['VOID']),
  VOID: Object.freeze([]),
})

/** Order for dropdowns / readability */
const ORDER_INDEX = Object.freeze(
  Object.fromEntries(['ISSUED', 'PENDING', 'OVERDUE', 'FAILED', 'PAID', 'VOID'].map((s, i) => [s, i])),
)

/** @readonly */
export const INVOICE_STATUS_LABELS = Object.freeze({
  ISSUED: 'Issued',
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  OVERDUE: 'Overdue',
  VOID: 'Void',
})

export function normalizeInvoiceStatus(value) {
  if (value == null || value === '') return ''
  const u = String(value).trim().toUpperCase()
  return INVOICE_STATUS_VALUES.includes(u) ? u : ''
}

export function sortInvoiceStatusTargets(targets) {
  if (!Array.isArray(targets)) return []
  return [...targets].sort((a, b) => (ORDER_INDEX[a] ?? 99) - (ORDER_INDEX[b] ?? 99))
}

export function allowedInvoiceStatusTargets(current) {
  const key = normalizeInvoiceStatus(current)
  if (!key) return []
  const next = INVOICE_STATUS_TRANSITIONS[key]
  if (!next?.length && key !== 'VOID') {
    return []
  }
  return sortInvoiceStatusTargets([...next])
}

export function isKnownInvoiceStatus(value) {
  return Boolean(normalizeInvoiceStatus(value))
}

/** @param {string | undefined} localDatetime datetime-local value */
export function localDatetimeToPaidAtIso(localDatetime) {
  if (localDatetime == null || String(localDatetime).trim() === '') return null
  const d = new Date(localDatetime)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
