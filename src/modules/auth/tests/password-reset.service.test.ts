import { describe, expect, it, vi } from 'vitest';
import { PasswordResetService } from '../application/password-reset.service';

describe('PasswordResetService', () => {
  it('sends reset email and writes audit log for known user', async () => {
    const users = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        passwordHash: 'hash',
        emailVerifiedAt: new Date(),
        isSuspended: false
      }),
      findById: vi.fn(),
      create: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn()
    };
    const tokens = {
      create: vi.fn().mockResolvedValue(undefined),
      consumeValidToken: vi.fn()
    };
    const notifier = { sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new PasswordResetService(users, tokens, notifier, audit);
    await service.requestReset('user@example.com');

    expect(tokens.create).toHaveBeenCalledTimes(1);
    expect(notifier.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.password_reset_requested', targetId: 'u1' })
    );
  });

  it('updates password for valid token', async () => {
    const users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn().mockResolvedValue(undefined)
    };
    const tokens = {
      create: vi.fn(),
      consumeValidToken: vi.fn().mockResolvedValue({ userId: 'u1' })
    };
    const notifier = { sendResetPasswordEmail: vi.fn() };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new PasswordResetService(users, tokens, notifier, audit);
    await service.resetPassword({ token: 'abc123abc123abc123abc123', newPassword: 'StrongPassword123!' });

    expect(users.updatePassword).toHaveBeenCalledTimes(1);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.password_reset_completed', targetId: 'u1' })
    );
  });
});
