import { z } from 'zod';

export const updateAccountEmailSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim())
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const updateOrganizationSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/)
});

export type UpdateAccountEmailInput = z.infer<typeof updateAccountEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
