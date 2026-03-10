import type { UserRepository } from '@/modules/users/domain/user.types';
import { AuthorizationError } from '@/modules/shared/domain/errors';

export class AdminAccessService {
  constructor(
    private readonly users: UserRepository,
    private readonly allowedEmails: Set<string>
  ) {}

  async requirePlatformAdmin(actorUserId: string): Promise<void> {
    const user = await this.users.findById(actorUserId);

    if (!user) {
      throw new AuthorizationError('Authenticated user was not found.');
    }

    if (!this.allowedEmails.has(user.email.toLowerCase())) {
      throw new AuthorizationError('Admin access is required.');
    }
  }
}
