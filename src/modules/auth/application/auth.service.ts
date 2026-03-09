import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import type { UserRepository } from '@/modules/users/domain/user.types';
import { hashPassword, verifyPassword } from '../domain/password';
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '../schemas/auth.schemas';

export type SessionIssuer = {
  issue(userId: string): Promise<{ token: string; expiresAt: Date }>;
};

export type EmailVerificationTokenCreator = {
  createToken(userId: string): Promise<string>;
};

export type EmailVerificationNotifier = {
  sendVerifyEmail(input: { userId: string; email: string; verificationToken: string }): Promise<void>;
};

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionIssuer: SessionIssuer,
    private readonly verificationTokenCreator: EmailVerificationTokenCreator,
    private readonly verificationNotifier: EmailVerificationNotifier,
    private readonly auditLogWriter: AuditLogWriter
  ) {}

  async signUp(rawInput: SignUpInput): Promise<{ userId: string }> {
    const input = signUpSchema.parse(rawInput);
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new AuthorizationError('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({ email: input.email, passwordHash });
    const verificationToken = await this.verificationTokenCreator.createToken(user.id);

    await this.verificationNotifier.sendVerifyEmail({
      userId: user.id,
      email: user.email,
      verificationToken
    });
    await this.auditLogWriter.write({
      actorUserId: user.id,
      organizationId: null,
      action: 'auth.signup',
      targetType: 'user',
      targetId: user.id
    });

    return { userId: user.id };
  }

  async signIn(rawInput: SignInInput): Promise<{ sessionToken: string; expiresAt: Date }> {
    const input = signInSchema.parse(rawInput);
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AuthorizationError('Invalid email or password.');
    }

    if (user.isSuspended) {
      throw new AuthorizationError('This account is suspended.');
    }

    if (!user.emailVerifiedAt) {
      throw new AuthorizationError('Email verification is required before signing in.');
    }

    const session = await this.sessionIssuer.issue(user.id);
    await this.auditLogWriter.write({
      actorUserId: user.id,
      organizationId: null,
      action: 'auth.signin',
      targetType: 'user',
      targetId: user.id
    });

    return { sessionToken: session.token, expiresAt: session.expiresAt };
  }
}
