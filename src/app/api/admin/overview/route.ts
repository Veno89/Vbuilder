import { NextResponse } from 'next/server';
import { authContextService } from '@/modules/auth/application/auth-container';
import { adminService } from '@/modules/admin/application/admin-container';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await authContextService.requireAuthenticatedActor(request);
    const rateLimit = await enforceRateLimit({
      key: rateLimitKeyFromRequest(request, `admin:overview:${actor.userId}`),
      limit: 30,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const result = await adminService.getOverview(actor.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load admin overview.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
