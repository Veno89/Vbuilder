import { NextResponse } from 'next/server';
import { authContextService } from '@/modules/auth/application/auth-container';
import { settingsService } from '@/modules/settings/application/settings-container';
import { toRouteErrorResponse } from '@/modules/shared/presentation/route-error-response';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await authContextService.requireAuthenticatedActor(request);
    const result = await settingsService.getAccount(actor.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeNotFoundError: true,
      fallbackMessage: 'Failed to get account settings.'
    });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const actor = await authContextService.requireAuthenticatedActor(request);
    const rateLimit = await enforceRateLimit({
      key: rateLimitKeyFromRequest(request, `settings:account.update:${actor.userId}`),
      limit: 10,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    await settingsService.updateAccountEmail({ ...body, actorUserId: actor.userId });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toRouteErrorResponse(error, {
      includeValidationError: true,
      includeNotFoundError: true,
      fallbackMessage: 'Failed to update account settings.'
    });
  }
}
