const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function buildUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function readJson(response) {
  return response.json().catch(() => null)
}

function normalizeApiError(payload, fallbackMessage) {
  if (payload?.error) {
    return {
      code: payload.error.code ?? 'INTERNAL_SERVER_ERROR',
      message: payload.error.message ?? fallbackMessage,
      requestId: payload.error.request_id ?? null,
      details: payload.error.details ?? null,
    }
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
    requestId: null,
    details: null,
  }
}

/**
 * @typedef {'shop_owner'} UploadPurpose
 * @typedef {'photo'|'promotion'} UploadCategory
 *
 * @typedef {Object} PresignRequest
 * @property {UploadPurpose} purpose
 * @property {string} filename
 * @property {string} content_type
 * @property {UploadCategory} category
 *
 * @typedef {Object} PresignResponse
 * @property {string} upload_url
 * @property {string} key
 */

/**
 * POST /uploads/presign
 * Response shapes vary between backends; we normalize to { upload_url, key }.
 *
 * @param {PresignRequest} payload
 * @param {{ accessToken: string }} opts
 * @returns {Promise<PresignResponse>}
 */
export async function presignUpload(payload, { accessToken }) {
  const response = await fetch(buildUrl('/uploads/presign'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const json = await readJson(response)
  if (!response.ok) {
    throw normalizeApiError(json, 'Could not create upload URL. Please try again.')
  }

  const data = json?.data ?? json
  const upload_url = data?.upload_url ?? data?.url ?? data?.uploadUrl
  const key = data?.key ?? data?.file_key ?? data?.fileKey ?? data?.object_key

  if (!upload_url || !key) {
    throw {
      code: 'INVALID_PRESIGN_RESPONSE',
      message: 'Upload URL response is missing required fields.',
      requestId: null,
      details: json,
    }
  }

  return { upload_url, key }
}

/**
 * PUT upload to a presigned URL with progress.
 *
 * @param {{ uploadUrl: string, file: File, contentType: string, onProgress?: (pct: number) => void }} args
 */
export function putPresignedUpload({ uploadUrl, file, contentType, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return
      const pct = Math.round((evt.loaded / evt.total) * 100)
      onProgress?.(pct)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true)
        return
      }
      reject({
        code: 'UPLOAD_FAILED',
        message: `Upload failed (HTTP ${xhr.status}).`,
        details: null,
        requestId: null,
      })
    }

    xhr.onerror = () => {
      reject({
        code: 'UPLOAD_FAILED',
        message: 'Upload failed due to a network error.',
        details: null,
        requestId: null,
      })
    }

    xhr.send(file)
  })
}

