import { z } from 'zod';

export const updateMembershipRoleSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer'])
});

export const removeMembershipSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid()
});

export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
export type RemoveMembershipInput = z.infer<typeof removeMembershipSchema>;
