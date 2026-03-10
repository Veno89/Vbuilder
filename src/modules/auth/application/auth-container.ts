import { db } from '@/server/db/client';
import {
  DrizzleEmailVerificationTokenRepository,
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserRepository
} from '../infrastructure/auth.repository';
import { AuthService } from './auth.service';
import { EmailVerificationConfirmService } from './email-verification-confirm.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService, type PasswordResetNotifier } from './password-reset.service';
import { SessionIssuerService } from './session-issuer.service';
import { AuthContextService } from './auth-context.service';
import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';

const noopVerificationNotifier = {
  async sendVerifyEmail(): Promise<void> {
    return;
  }
};

const noopPasswordResetNotifier: PasswordResetNotifier = {
  async sendResetPasswordEmail(): Promise<void> {
    return;
  }
};

const users = new DrizzleUserRepository(db);
const sessions = new DrizzleSessionRepository(db);
const verificationTokens = new DrizzleEmailVerificationTokenRepository(db);
const resetTokens = new DrizzlePasswordResetTokenRepository(db);

const sessionIssuer = new SessionIssuerService(sessions);
const emailVerificationService = new EmailVerificationService(verificationTokens);

export const authService = new AuthService(
  users,
  sessionIssuer,
  emailVerificationService,
  noopVerificationNotifier,
  auditLogWriter
);

export const emailVerificationConfirmService = new EmailVerificationConfirmService(
  verificationTokens,
  users,
  auditLogWriter
);

export const passwordResetService = new PasswordResetService(
  users,
  resetTokens,
  noopPasswordResetNotifier,
  auditLogWriter
);

export const sessionRepository = sessions;
export const userRepository = users;
export const authContextService = new AuthContextService(sessions, users);
