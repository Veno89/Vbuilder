import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authContextService } from '@/modules/auth/application/auth-container';
import { billingService } from '@/modules/billing/application/billing-container';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const actor = await authContextService.requireAuthenticatedActor(request);
    const rateLimit = await enforceRateLimit({
      key: rateLimitKeyFromRequest(request, `billing:checkout:${actor.userId}`),
      limit: 10,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const result = await billingService.createCheckoutSession({ ...body, actorUserId: actor.userId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to create checkout session.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
