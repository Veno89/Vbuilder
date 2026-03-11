import { AuthorizationError } from '@/modules/shared/domain/errors';
import { hashToken } from '../domain/token';
import type { SessionRepository } from '../domain/session.types';
import type { UserRepository } from '@/modules/users/domain/user.types';

const sessionCookieName = 'vb_session';

function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookiePart = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookiePart) {
    return null;
  }

  const [, value] = cookiePart.split('=');
  if (!value) {
    return null;
  }

  return decodeURIComponent(value);
}

export class AuthContextService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository
  ) {}

  async requireAuthenticatedActor(request: Request): Promise<{ userId: string; email: string }> {
    const sessionToken = getCookieValue(request.headers.get('cookie'), sessionCookieName);
    if (!sessionToken) {
      throw new AuthorizationError('Authentication is required.');
    }

    const session = await this.sessions.findValidByTokenHash(hashToken(sessionToken));
    if (!session) {
      throw new AuthorizationError('Invalid or expired session.');
    }

    const user = await this.users.findById(session.userId);
    if (!user || user.isSuspended) {
      throw new AuthorizationError('Invalid authenticated user.');
    }

    return { userId: session.userId, email: user.email };
  }
}
