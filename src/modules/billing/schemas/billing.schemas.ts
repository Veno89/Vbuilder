import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  organizationId: z.string().uuid(),
  planKey: z.enum(['starter', 'pro']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const createPortalSessionSchema = z.object({
  organizationId: z.string().uuid(),
  returnUrl: z.string().url().optional()
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CreatePortalSessionInput = z.infer<typeof createPortalSessionSchema>;
