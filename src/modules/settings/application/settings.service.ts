import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { verifyPassword, hashPassword } from '@/modules/auth/domain/password';
import type { OrgPermissionGuard } from '@/modules/permissions/application/org-permission.service';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';
import {
  changePasswordSchema,
  updateAccountEmailSchema,
  updateOrganizationSettingsSchema,
  type ChangePasswordInput,
  type UpdateAccountEmailInput,
  type UpdateOrganizationSettingsInput
} from '../schemas/settings.schemas';
import { SettingsRepository } from '../infrastructure/settings.repository';

export class SettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly permissions: OrgPermissionGuard,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async getAccount(actorUserId: string): Promise<{
    id: string;
    email: string;
    emailVerifiedAt: Date | null;
    isSuspended: boolean;
  }> {
    const account = await this.repository.findAccountByUserId(actorUserId);

    if (!account) {
      throw new NotFoundError('Authenticated user account was not found.');
    }

    return account;
  }

  async updateAccountEmail(rawInput: UpdateAccountEmailInput & { actorUserId: string }): Promise<void> {
    const input = updateAccountEmailSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    const current = await this.repository.findAccountByUserId(actorUserId);
    if (!current) {
      throw new NotFoundError('Authenticated user account was not found.');
    }

    if (current.email === input.email) {
      return;
    }

    const existing = await this.repository.findAccountByEmail(input.email);
    if (existing && existing.id !== actorUserId) {
      throw new AuthorizationError('An account with this email already exists.');
    }

    await this.repository.updateAccountEmail(actorUserId, input.email);

    await this.auditLogs.write({
      actorUserId,
      organizationId: null,
      action: 'settings.account_email_updated',
      targetType: 'user',
      targetId: actorUserId,
      metadata: { previousEmail: current.email, newEmail: input.email }
    });
  }

  async changePassword(rawInput: ChangePasswordInput & { actorUserId: string }): Promise<void> {
    const input = changePasswordSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    const currentPasswordHash = await this.repository.findPasswordHashByUserId(actorUserId);
    if (!currentPasswordHash) {
      throw new NotFoundError('Authenticated user account was not found.');
    }

    const validCurrentPassword = await verifyPassword(input.currentPassword, currentPasswordHash);
    if (!validCurrentPassword) {
      throw new AuthorizationError('Current password is incorrect.');
    }

    const nextPasswordHash = await hashPassword(input.newPassword);
    await this.repository.updatePasswordHash(actorUserId, nextPasswordHash);

    await this.auditLogs.write({
      actorUserId,
      organizationId: null,
      action: 'settings.password_updated',
      targetType: 'user',
      targetId: actorUserId
    });
  }

  async updateOrganizationSettings(
    rawInput: UpdateOrganizationSettingsInput & { actorUserId: string }
  ): Promise<void> {
    const input = updateOrganizationSettingsSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    await this.permissions.requireOrgPermission({
      actorUserId,
      organizationId: input.organizationId,
      permission: 'organization:update'
    });

    const existingWithSlug = await this.repository.findOrganizationBySlug(input.slug);
    if (existingWithSlug && existingWithSlug.id !== input.organizationId) {
      throw new AuthorizationError('Organization slug is already in use.');
    }

    await this.repository.updateOrganizationSettings({
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug
    });

    await this.auditLogs.write({
      actorUserId,
      organizationId: input.organizationId,
      action: 'organization.settings_updated',
      targetType: 'organization',
      targetId: input.organizationId,
      metadata: { slug: input.slug }
    });
  }
}
