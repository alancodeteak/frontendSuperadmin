import { cachedGetJson } from '@/apis/cachedGet'
import { TTL_MS } from '@/utils/responseCache'
import { normalizeApiError, requestJson, requestRaw } from '@/apis/httpClient'

async function requestEnvelope({ path, method = 'GET', accessToken, body }) {
  if (method === 'GET' && body === undefined) {
    return cachedGetJson({
      path,
      accessToken,
      ttlMs: TTL_MS.DEFAULT_GET,
      headers: { 'Content-Type': 'application/json' },
      onHttpError: (json) => normalizeApiError(json, 'Invoice API request failed'),
      select: (j) => ({ data: j?.data ?? null, meta: j?.meta ?? null }),
    })
  }
  const json = await requestRaw({
    path,
    method,
    accessToken,
    body,
    onHttpError: (j) => normalizeApiError(j, 'Invoice API request failed'),
  })
  return { data: json?.data ?? null, meta: json?.meta ?? null }
}

export async function listAdminInvoices(params, { accessToken }) {
  const query = new URLSearchParams(params ?? {})
  return requestJson({ path: `/api/v1/admin/invoices?${query.toString()}`, accessToken })
}

export async function listAdminInvoicesEnvelope(params, { accessToken }) {
  const query = new URLSearchParams(params ?? {})
  return requestEnvelope({ path: `/api/v1/admin/invoices?${query.toString()}`, accessToken })
}

export async function getAdminAccountsOverview({ days = 30 } = {}, { accessToken }) {
  const query = new URLSearchParams({ days: String(days) })
  return requestJson({ path: `/api/v1/admin/invoices/overview?${query.toString()}`, accessToken })
}

export async function getAdminInvoice(invoiceId, { accessToken }) {
  return requestJson({ path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}`, accessToken })
}

export async function createAdminInvoice(payload, { accessToken }) {
  return requestJson({
    path: '/api/v1/admin/invoices/create-manual',
    method: 'POST',
    accessToken,
    body: payload,
  })
}

export async function updateAdminInvoiceStatus(invoiceId, payload, { accessToken }) {
  const query = new URLSearchParams(payload ?? {})
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}/status?${query.toString()}`,
    method: 'PATCH',
    accessToken,
  })
}

export async function updateAdminInvoice(invoiceId, payload, { accessToken }) {
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}`,
    method: 'PUT',
    accessToken,
    body: payload,
  })
}

export async function retryAdminBill(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}/retry-bill`,
    method: 'POST',
    accessToken,
  })
}

export async function sendAdminInvoiceEmail(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}/send-email`,
    method: 'POST',
    accessToken,
  })
}

export async function sendAdminInvoiceFollowup(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}/send-followup-email`,
    method: 'POST',
    accessToken,
  })
}

export async function downloadAdminInvoice(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/admin/invoices/${encodeURIComponent(String(invoiceId))}/download`,
    accessToken,
  })
}

export async function listPortalInvoices(params, { accessToken }) {
  const query = new URLSearchParams(params ?? {})
  return requestJson({ path: `/api/v1/portal/invoices?${query.toString()}`, accessToken })
}

export async function listPortalInvoicesEnvelope(params, { accessToken }) {
  const query = new URLSearchParams(params ?? {})
  return requestEnvelope({ path: `/api/v1/portal/invoices?${query.toString()}`, accessToken })
}

export async function getPortalAccountsOverview({ days = 30 } = {}, { accessToken }) {
  const query = new URLSearchParams({ days: String(days) })
  return requestJson({ path: `/api/v1/portal/invoices/overview?${query.toString()}`, accessToken })
}

export async function getPortalInvoice(invoiceId, { accessToken }) {
  return requestJson({ path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}`, accessToken })
}

export async function updatePortalInvoice(invoiceId, payload, { accessToken }) {
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}`,
    method: 'PUT',
    accessToken,
    body: payload,
  })
}

export async function updatePortalInvoiceStatus(invoiceId, payload, { accessToken }) {
  const query = new URLSearchParams(payload ?? {})
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}/status?${query.toString()}`,
    method: 'PATCH',
    accessToken,
  })
}

export async function retryPortalBill(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}/retry-bill`,
    method: 'POST',
    accessToken,
  })
}

export async function sendPortalInvoiceEmail(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}/send-email`,
    method: 'POST',
    accessToken,
  })
}

export async function sendPortalInvoiceFollowup(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}/send-followup-email`,
    method: 'POST',
    accessToken,
  })
}

export async function downloadPortalInvoice(invoiceId, { accessToken }) {
  return requestJson({
    path: `/api/v1/portal/invoices/${encodeURIComponent(String(invoiceId))}/download`,
    accessToken,
  })
}

