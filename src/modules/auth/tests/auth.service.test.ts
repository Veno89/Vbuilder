import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../application/auth.service';
import { hashPassword } from '../domain/password';

describe('AuthService', () => {
  it('creates a new user and sends verification email on sign up', async () => {
    const userRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        passwordHash: 'ignored',
        emailVerifiedAt: null,
        isSuspended: false
      })
    };

    const sessionIssuer = { issue: vi.fn() };
    const tokenCreator = { createToken: vi.fn().mockResolvedValue('verify-token') };
    const notifier = { sendVerifyEmail: vi.fn().mockResolvedValue(undefined) };
    const auditLogWriter = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository,
      sessionIssuer,
      tokenCreator,
      notifier,
      auditLogWriter
    );
    const result = await service.signUp({ email: 'user@example.com', password: 'StrongPassword123!' });

    expect(result.userId).toBe('user_1');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(tokenCreator.createToken).toHaveBeenCalledWith('user_1');
    expect(notifier.sendVerifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ verificationToken: 'verify-token' })
    );
    expect(auditLogWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.signup', targetId: 'user_1' })
    );
  });

  it('issues session on valid sign in', async () => {
    const passwordHash = await hashPassword('StrongPassword123!');
    const userRepository = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
        isSuspended: false
      }),
      findById: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn(),
      create: vi.fn()
    };

    const sessionIssuer = {
      issue: vi.fn().mockResolvedValue({ token: 'session_token', expiresAt: new Date('2030-01-01') })
    };
    const tokenCreator = { createToken: vi.fn() };
    const notifier = { sendVerifyEmail: vi.fn() };
    const auditLogWriter = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository,
      sessionIssuer,
      tokenCreator,
      notifier,
      auditLogWriter
    );
    const result = await service.signIn({ email: 'user@example.com', password: 'StrongPassword123!' });

    expect(result.sessionToken).toBe('session_token');
    expect(sessionIssuer.issue).toHaveBeenCalledWith('user_1');
    expect(auditLogWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.signin', targetId: 'user_1' })
    );
  });
});
