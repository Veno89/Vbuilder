import { AuthorizationError } from '@/modules/shared/domain/errors';
import { hasPermission, type Permission, type Role } from '../domain/permissions';

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
