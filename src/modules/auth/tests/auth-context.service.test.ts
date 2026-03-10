import { describe, expect, it, vi } from 'vitest';
import { AuthContextService } from '../application/auth-context.service';

describe('AuthContextService', () => {
  it('resolves actor from a valid session cookie', async () => {
    const sessions = {
      findValidByTokenHash: vi.fn().mockResolvedValue({ userId: 'user-1' })
    };
    const users = {
      findById: vi.fn().mockResolvedValue({ id: 'user-1', isSuspended: false })
    };

    const service = new AuthContextService(sessions as never, users as never);

    const request = new Request('https://example.com', {
      headers: { cookie: 'vb_session=session-token-value-over-20' }
    });

    const actor = await service.requireAuthenticatedActor(request);

    expect(actor.userId).toBe('user-1');
    expect(sessions.findValidByTokenHash).toHaveBeenCalledTimes(1);
  });

  it('throws when no session cookie exists', async () => {
    const sessions = { findValidByTokenHash: vi.fn() };
    const users = { findById: vi.fn() };
    const service = new AuthContextService(sessions as never, users as never);

    await expect(service.requireAuthenticatedActor(new Request('https://example.com'))).rejects.toThrow(
      'Authentication is required.'
    );
  });
});
