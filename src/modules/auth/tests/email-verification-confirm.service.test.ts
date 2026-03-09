import { describe, expect, it, vi } from 'vitest';
import { EmailVerificationConfirmService } from '../application/email-verification-confirm.service';
import { hashToken } from '../domain/token';

describe('EmailVerificationConfirmService', () => {
  it('consumes token, verifies user, and writes audit event', async () => {
    const tokenRepository = {
      consumeValidToken: vi.fn().mockResolvedValue({ userId: 'u1' }),
      create: vi.fn()
    };
    const users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      markEmailVerified: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn()
    };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new EmailVerificationConfirmService(tokenRepository, users, audit);
    await service.confirm('abc123abc123abc123abc123');

    expect(tokenRepository.consumeValidToken).toHaveBeenCalledWith(
      hashToken('abc123abc123abc123abc123')
    );
    expect(users.markEmailVerified).toHaveBeenCalledWith('u1');
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.verify_email', targetId: 'u1' })
    );
  });
});
