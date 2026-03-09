export type Plan = 'free' | 'starter' | 'pro';

export type Entitlements = {
  maxMembers: number;
  features: {
    advancedAuditExports: boolean;
    prioritySupport: boolean;
  };
};

const entitlementMap: Record<Plan, Entitlements> = {
  free: {
    maxMembers: 3,
    features: {
      advancedAuditExports: false,
      prioritySupport: false
    }
  },
  starter: {
    maxMembers: 15,
    features: {
      advancedAuditExports: true,
      prioritySupport: false
    }
  },
  pro: {
    maxMembers: 100,
    features: {
      advancedAuditExports: true,
      prioritySupport: true
    }
  }
};

export function resolveEntitlements(plan: Plan): Entitlements {
  return entitlementMap[plan];
}

export function canAddMember(currentMemberCount: number, plan: Plan): boolean {
  return currentMemberCount < resolveEntitlements(plan).maxMembers;
}
