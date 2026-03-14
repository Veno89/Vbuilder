import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashToken } from '@/modules/auth/domain/token';

const revokeByTokenHash = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  sessionRepository: {
    revokeByTokenHash
  }
}));

describe('POST /api/auth/logout route boundary', () => {
  beforeEach(() => {
    revokeByTokenHash.mockReset();
    revokeByTokenHash.mockResolvedValue(undefined);
  });

  it('revokes session when vb_session cookie is present', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: 'foo=bar; vb_session=raw-session-token; a=b'
        }
      })
    );

    expect(response.status).toBe(200);
    expect(revokeByTokenHash).toHaveBeenCalledWith(hashToken('raw-session-token'));
    expect(response.headers.get('set-cookie')).toContain('vb_session=;');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).toContain('Path=/');
  });

  it('parses session tokens that contain equals signs', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: 'vb_session=token-with-padding==; another=value'
        }
      })
    );

    expect(response.status).toBe(200);
    expect(revokeByTokenHash).toHaveBeenCalledWith(hashToken('token-with-padding=='));
  });

  it('returns success even when no session cookie exists', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/logout', {
        method: 'POST'
      })
    );

    expect(response.status).toBe(200);
    expect(revokeByTokenHash).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
