import { NextResponse } from 'next/server';
import { authContextService } from '@/modules/auth/application/auth-container';
import { membershipService } from '@/modules/memberships/application/membership-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const actor = await authContextService.requireAuthenticatedActor(request);
    const rateLimit = await enforceRateLimit({
      key: rateLimitKeyFromRequest(request, `org:member.remove:${actor.userId}`),
      limit: 20,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    await membershipService.remove({ ...body, actorUserId: actor.userId });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      includeNotFoundError: true,
      fallbackMessage: 'Failed to remove member.'
    });
  }
}
