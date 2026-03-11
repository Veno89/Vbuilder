import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authContextService } from '@/modules/auth/application/auth-container';
import { settingsService } from '@/modules/settings/application/settings-container';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await authContextService.requireAuthenticatedActor(request);
    const result = await settingsService.getAccount(actor.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get account settings.';
    return NextResponse.json({ error: message }, { status: 400 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to update account settings.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
