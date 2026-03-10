import { describe, expect, it, vi } from 'vitest';
import { EntitlementEnforcementService } from '../application/entitlement-enforcement.service';

describe('EntitlementEnforcementService', () => {
  it('allows adding member when under plan limits', async () => {
    const members = { countByOrganizationId: vi.fn().mockResolvedValue(2) };
    const plans = { findPlanByOrganizationId: vi.fn().mockResolvedValue('free') };

    const service = new EntitlementEnforcementService(members, plans);

    await expect(service.assertCanAddMember('org1')).resolves.toBeUndefined();
  });

  it('rejects member addition when plan limit is reached', async () => {
    const members = { countByOrganizationId: vi.fn().mockResolvedValue(3) };
    const plans = { findPlanByOrganizationId: vi.fn().mockResolvedValue('free') };

    const service = new EntitlementEnforcementService(members, plans);

    await expect(service.assertCanAddMember('org1')).rejects.toThrow('Plan member limit reached.');
  });
});
