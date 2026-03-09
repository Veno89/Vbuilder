import { z } from 'zod';

export const createOrganizationSchema = z.object({
  actorUserId: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
