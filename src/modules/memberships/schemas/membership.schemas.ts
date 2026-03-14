import { z } from 'zod';
import { mutableMembershipRoles } from '../domain/membership.types';

export const updateMembershipRoleSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  role: z.enum(mutableMembershipRoles)
});

export const removeMembershipSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid()
});

export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
export type RemoveMembershipInput = z.infer<typeof removeMembershipSchema>;
