import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters long.')
    .max(128, 'Password exceeds maximum length.')
});

export const signInSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim())
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters long.')
    .max(128, 'Password exceeds maximum length.')
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
