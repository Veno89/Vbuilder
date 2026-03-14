import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

type RouteErrorResponseOptions = {
  fallbackMessage: string;
  includeValidationError?: boolean;
  includeNotFoundError?: boolean;
  authorizationStatus?: 400 | 401 | 403 | 409;
};

export function toRouteErrorResponse(error: unknown, options: RouteErrorResponseOptions): Response {
  if (options.includeValidationError && error instanceof ZodError) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: options.authorizationStatus ?? 403 }
    );
  }

  if (options.includeNotFoundError && error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ error: options.fallbackMessage }, { status: 500 });
}
