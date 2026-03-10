import { describe, expect, it, vi } from 'vitest';
import { SessionIssuerService } from '../application/session-issuer.service';

describe('SessionIssuerService', () => {
  it('persists hashed session token and revokes prior active sessions', async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({
        id: 's1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null
      }),
      findValidByTokenHash: vi.fn(),
      revokeByTokenHash: vi.fn(),
      revokeAllActiveForUserExcept: vi.fn().mockResolvedValue(undefined)
    };

    const service = new SessionIssuerService(repository);
    const result = await service.issue('u1');

    expect(result.token).toBeTruthy();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tokenHash: expect.any(String) })
    );
    expect(repository.revokeAllActiveForUserExcept).toHaveBeenCalledWith(
      'u1',
      expect.any(String)
    );
  });
});
