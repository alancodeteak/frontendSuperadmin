export function firstIssueMessage(zodError, fallback = 'Invalid input') {
  const issue = zodError?.issues?.[0]
  return issue?.message || fallback
}

export function validateOrThrow(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const err = new Error(firstIssueMessage(result.error))
    err.code = 'CLIENT_VALIDATION_ERROR'
    err.details = result.error.issues
    throw err
  }
  return result.data
}

