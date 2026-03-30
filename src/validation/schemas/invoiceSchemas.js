import { z } from 'zod'

export const invoiceStatusSchema = z.enum(['ISSUED', 'PENDING', 'PAID', 'FAILED', 'OVERDUE', 'VOID'])

export const invoiceDocumentTypeSchema = z.enum(['INVOICE', 'BILL'])

export const invoiceSearchSchema = z
  .string()
  .trim()
  .max(80, 'Search is too long')
  .transform((v) => v.replace(/\s+/g, ' '))

export const invoiceNoteMessageSchema = z
  .string({ required_error: 'Note is required' })
  .trim()
  .min(1, 'Note cannot be empty')
  .max(500, 'Note is too long (max 500 characters)')
  .refine((v) => !/<[^>]*>/.test(v), 'HTML is not allowed in notes')

export const deleteNoteCommandSchema = z
  .string()
  .trim()
  .regex(/^__DELETE_NOTE_ID__:\d+$/, 'Invalid delete command')

export const transactionReferenceSchema = z
  .string()
  .trim()
  .min(1, 'Transaction reference is required')
  .max(100, 'Transaction reference is too long')
  .regex(/^[\w\-./]+$/, 'Transaction reference contains invalid characters')

