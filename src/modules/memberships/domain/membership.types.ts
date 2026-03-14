export const membershipRoles = ['owner', 'admin', 'member', 'viewer'] as const;
export const mutableMembershipRoles = ['admin', 'member', 'viewer'] as const;

export type MembershipRole = (typeof membershipRoles)[number];
export type MutableMembershipRole = (typeof mutableMembershipRoles)[number];

export type MembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
};
