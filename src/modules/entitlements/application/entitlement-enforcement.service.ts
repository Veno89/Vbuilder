import { canAddMember, type Plan } from '../domain/entitlements';
import { AuthorizationError } from '@/modules/shared/domain/errors';

export type OrganizationMemberCounter = {
  countByOrganizationId(organizationId: string): Promise<number>;
};

export type OrganizationPlanReader = {
  findPlanByOrganizationId(organizationId: string): Promise<Plan | null>;
};

export class EntitlementEnforcementService {
  constructor(
    private readonly members: OrganizationMemberCounter,
    private readonly plans: OrganizationPlanReader
  ) {}

  async assertCanAddMember(organizationId: string): Promise<void> {
    const [memberCount, plan] = await Promise.all([
      this.members.countByOrganizationId(organizationId),
      this.plans.findPlanByOrganizationId(organizationId)
    ]);

    const resolvedPlan = plan ?? 'free';
    if (!canAddMember(memberCount, resolvedPlan)) {
      throw new AuthorizationError('Plan member limit reached.');
    }
  }
}
