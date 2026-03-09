import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { enforceRateLimit, rateLimitKeyFromRequest } from '@/modules/shared/security/rate-limit';
import { passwordResetService } from '@/modules/auth/application/auth-container';
import { resetPasswordSchema } from '@/modules/auth/schemas/auth.schemas';

export async function POST(request: Request): Promise<Response> {

  const rateLimit = enforceRateLimit({
    key: rateLimitKeyFromRequest(request, 'auth:reset-password'),
    limit: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please retry later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }
  try {
    const body = resetPasswordSchema.parse(await request.json());
    await passwordResetService.resetPassword({ token: body.token, newPassword: body.newPassword });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to reset password.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
