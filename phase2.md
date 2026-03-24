# Frontend API Handoff

This document is the shareable API contract for frontend integration.

## Base Information

- Base URL (local): `http://127.0.0.1:8000`
- Success envelope:
  - `{"data": ..., "meta": ...}`
- Error envelope:
  - `{"error":{"code":"...","message":"...","request_id":"...","details":{...}}}`
- Auth header for protected APIs:
  - `Authorization: Bearer <access_token>`

## Public APIs (No JWT)

### Health

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /health/full` (can return `403` in production if detailed health is disabled)

## Protected APIs (JWT Required)

All APIs below require:

- `Authorization: Bearer <access_token>`

### Phase 2 APIs

#### Dashboard

- `GET /dashboard/data`
- Response fields:
  - `total_orders`
  - `total_revenue`
  - `pending_orders`
  - `completed_orders`

#### Search

- `GET /search/?q=<text>&page=1&page_size=20`
- Query params:
  - `q` (required, 1-100 chars)
  - `page` (optional, default `1`)
  - `page_size` (optional, default `20`, max `100`)
- Response fields:
  - `items[]` with `order_id`, `customer_name`, `shop_id`, `total_amount`, `order_status`
  - `page`, `page_size`, `total`

#### Report (async job flow)

- `POST /report/jobs`
  - Request body:
```json
{
  "report_type": "orders_summary",
  "format": "csv",
  "q": "optional-filter"
}
```
  - `report_type` values:
    - `orders_summary`
    - `orders_detailed`
  - `format` currently supports:
    - `csv`

- `GET /report/jobs/{job_id}`
  - Returns status:
    - `queued`
    - `running`
    - `ready`
    - `failed`

- `GET /report/jobs/{job_id}/download`
  - Returns generated report payload when ready
  - Returns:
    - `409` when report is not ready
    - `404` when `job_id` does not exist

### Other Protected APIs (current baseline)

- `GET /portal/`
- `GET /analytics/`
- `GET /daily-activity/`
- `GET /delivery-partners/`
- `GET /monitorapp/`
- `GET /api/v1/admin/invoices/`

### Orders APIs (protected)

- `GET /api/v1/orders/?page=1&page_size=20`
- `GET /api/v1/orders/{order_id}`
- `POST /api/v1/orders/`
- `PATCH /api/v1/orders/{order_id}`

## Frontend Error Codes to Handle

### Auth and OTP

- `OTP_SENT`
- `OTP_INVALID`
- `OTP_EXPIRED`
- `OTP_ATTEMPTS_EXCEEDED`
- `OTP_RATE_LIMITED`
- `OTP_DELIVERY_FAILED`
- `UNAUTHENTICATED`
- `UNAUTHORIZED`
- `AUTH_SESSION_EXPIRED`

### Validation and Generic

- `VALIDATION_ERROR`
- `REQUEST_VALIDATION_ERROR`
- `INTERNAL_SERVER_ERROR`

## Frontend Integration Flow

1. Use existing login implementation to obtain `access_token`.
2. Attach `Authorization: Bearer <access_token>` for protected APIs.
3. On `401` (`UNAUTHENTICATED` or `AUTH_SESSION_EXPIRED`), force re-login.
4. On logout, clear token/session from client state.

## CORS Note

Frontend origin allowlist includes:

- `http://localhost:5173`

If browser still shows CORS issues:

- restart backend after env/config change
- verify preflight response headers in network tab
- ensure frontend sends `Authorization` only when token exists

