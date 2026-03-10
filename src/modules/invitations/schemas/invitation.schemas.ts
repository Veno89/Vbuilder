import { z } from 'zod';

export const sendInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  role: z.enum(['admin', 'member', 'viewer'])
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(20)
});

export const declineInvitationSchema = z.object({
  token: z.string().min(20)
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type DeclineInvitationInput = z.infer<typeof declineInvitationSchema>;
