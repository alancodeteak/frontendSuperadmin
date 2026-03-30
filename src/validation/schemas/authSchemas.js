import { z } from 'zod'

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(3, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email')
  .transform((v) => v.toLowerCase())

export const otpSchema = z
  .string({ required_error: 'OTP is required' })
  .trim()
  .regex(/^\d{6}$/, 'OTP must be 6 digits')

