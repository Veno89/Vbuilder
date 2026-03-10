import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
});

export const transferOwnershipSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid()
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
