import { normalizeApiError, requestRaw } from '@/apis/httpClient'

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
  const json = await requestRaw({
    path: '/uploads/presign',
    method: 'POST',
    accessToken,
    body: payload,
    onHttpError: (j) => normalizeApiError(j, 'Could not create upload URL. Please try again.'),
  })

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

