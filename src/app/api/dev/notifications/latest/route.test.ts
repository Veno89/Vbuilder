import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLatestNotification = vi.fn();

vi.mock('@/modules/notifications/application/notification-inbox', () => ({
  getLatestNotification
}));

describe('GET /api/dev/notifications/latest', () => {
  beforeEach(() => {
    vi.resetModules();
    getLatestNotification.mockReset();
  });

  it('returns 401 when dev inbox token is invalid', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=user@example.com', {
        headers: { 'x-dev-inbox-token': 'wrong-token' }
      })
    );

    expect(response.status).toBe(401);
    expect(getLatestNotification).not.toHaveBeenCalled();
  });

  it('returns 401 when dev inbox token header is missing', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.com/api/dev/notifications/latest?email=user@example.com'));

    expect(response.status).toBe(401);
    expect(getLatestNotification).not.toHaveBeenCalled();
  });

  it('accepts token header value normalized by the request runtime', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    getLatestNotification.mockReturnValue(null);

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=user@example.com', {
        headers: { 'x-dev-inbox-token': ' expected-token ' }
      })
    );

    expect(response.status).toBe(404);
    expect(getLatestNotification).toHaveBeenCalledWith('user@example.com');
  });

  it('returns 404 when route is disabled in production', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'production',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=user@example.com', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 when inbox is disabled outside production', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: false,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=user@example.com', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(404);
    expect(getLatestNotification).not.toHaveBeenCalled();
  });

  it('returns 400 when email query parameter is missing', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(400);
    expect(getLatestNotification).not.toHaveBeenCalled();
  });

  it('returns 400 when email query parameter is blank', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=%20%20%20', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(400);
    expect(getLatestNotification).not.toHaveBeenCalled();
  });

  it('returns 404 when no notification exists for email', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    getLatestNotification.mockReturnValue(null);

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=missing@example.com', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(404);
    expect(getLatestNotification).toHaveBeenCalledWith('missing@example.com');
  });

  it('trims email query value before inbox lookup', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    getLatestNotification.mockReturnValue(null);

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=%20user@example.com%20', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(404);
    expect(getLatestNotification).toHaveBeenCalledWith('user@example.com');
  });

  it('returns latest notification for email when enabled and authorized', async () => {
    vi.doMock('@/server/env', () => ({
      env: {
        NODE_ENV: 'development',
        NOTIFICATION_INBOX_ENABLED: true,
        DEV_INBOX_TOKEN: 'expected-token'
      }
    }));

    getLatestNotification.mockReturnValue({
      to: 'user@example.com',
      subject: 'Verify your email',
      html: '<a href="https://app.test/verify-email?token=abc">Verify email</a>',
      createdAt: new Date().toISOString(),
      verificationToken: 'abc'
    });

    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://example.com/api/dev/notifications/latest?email=user@example.com', {
        headers: { 'x-dev-inbox-token': 'expected-token' }
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notification.subject).toBe('Verify your email');
    expect(body.notification.verificationToken).toBe('abc');
    expect(getLatestNotification).toHaveBeenCalledWith('user@example.com');
  });
});
