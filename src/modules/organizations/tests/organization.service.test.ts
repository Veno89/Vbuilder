import { describe, expect, it, vi } from 'vitest';
import { OrganizationService } from '../application/organization.service';

describe('OrganizationService', () => {
  it('creates organization and owner membership', async () => {
    const organizations = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'org1', name: 'Acme', slug: 'acme', ownerUserId: 'u1' })
    };
    const memberships = { create: vi.fn().mockResolvedValue({}) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new OrganizationService(organizations as never, memberships as never, audit);
    const result = await service.create({ actorUserId: '00000000-0000-0000-0000-000000000001', name: 'Acme', slug: 'acme' });

    expect(result.organizationId).toBe('org1');
    expect(memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org1', role: 'owner' })
    );
  });
});
