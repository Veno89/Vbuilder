import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authContextService } from '@/modules/auth/application/auth-container';
import { invitationService } from '@/modules/invitations/application/invitation-container';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const actor = await authContextService.requireAuthenticatedActor(request);
    const rateLimit = enforceRateLimit({
      key: rateLimitKeyFromRequest(request, `invite:accept:${actor.userId}`),
      limit: 30,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const result = await invitationService.accept({ ...body, actorUserId: actor.userId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to accept invitation.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
