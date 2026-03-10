export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'organization:update'
  | 'organization:billing.manage'
  | 'organization:ownership.transfer'
  | 'members:read'
  | 'members:invite'
  | 'members:remove'
  | 'members:role.update'
  | 'app:use'
  | 'admin:access';

const rolePermissions: Record<Role, Permission[]> = {
  owner: [
    'organization:update',
    'organization:billing.manage',
    'organization:ownership.transfer',
    'members:read',
    'members:invite',
    'members:remove',
    'members:role.update',
    'app:use'
  ],
  admin: [
    'organization:update',
    'members:read',
    'members:invite',
    'members:remove',
    'members:role.update',
    'app:use'
  ],
  member: ['members:read', 'app:use'],
  viewer: ['members:read']
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
