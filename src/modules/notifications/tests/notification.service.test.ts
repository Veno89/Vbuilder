import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../application/notification.service';
import { clearNotificationsForEmail, getLatestNotification } from '../application/notification-inbox';

describe('NotificationService', () => {
  it('sends verification email through provider', async () => {
    const provider = { sendEmail: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(provider, 'https://app.test', false);

    await service.sendVerifyEmail({
      userId: 'user-1',
      email: 'user@example.com',
      verificationToken: 'token-123'
    });

    expect(provider.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Verify your email'
      })
    );
  });


  it('captures verification token in inbox when capture is enabled', async () => {
    const provider = { sendEmail: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(provider, 'https://app.test', true);
    const email = 'verify-capture@example.com';

    clearNotificationsForEmail(email);

    await service.sendVerifyEmail({
      userId: 'user-1',
      email,
      verificationToken: 'token-123'
    });

    const latest = getLatestNotification(email);
    expect(latest?.verificationToken).toBe('token-123');

    clearNotificationsForEmail(email);
  });

  it('throws explicit error when invitation send fails', async () => {
    const provider = { sendEmail: vi.fn().mockRejectedValue(new Error('provider down')) };
    const service = new NotificationService(provider, 'https://app.test', false);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      service.sendOrganizationInvite({
        email: 'invitee@example.com',
        organizationId: 'org-1',
        invitedByUserId: 'user-1',
        token: 'invite-token-123',
        role: 'member'
      })
    ).rejects.toThrow('Unable to deliver organization invitation email.');

    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
