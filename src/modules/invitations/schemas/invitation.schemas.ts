import { z } from 'zod';

export const sendInvitationSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  role: z.enum(['admin', 'member', 'viewer'])
});

export const acceptInvitationSchema = z.object({
  actorUserId: z.string().uuid(),
  token: z.string().min(20)
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
