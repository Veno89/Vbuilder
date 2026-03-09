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
import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';

const noopAuditWriter: AuditLogWriter = {
  async write(): Promise<void> {
    return;
  }
};

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
  noopAuditWriter
);

export const emailVerificationConfirmService = new EmailVerificationConfirmService(
  verificationTokens,
  users,
  noopAuditWriter
);

export const passwordResetService = new PasswordResetService(
  users,
  resetTokens,
  noopPasswordResetNotifier,
  noopAuditWriter
);

export const sessionRepository = sessions;
