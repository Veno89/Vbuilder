import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';
import { toRouteErrorResponse } from './route-error-response';

describe('toRouteErrorResponse', () => {
  it('maps zod errors to 400 when enabled', async () => {
    const response = toRouteErrorResponse(new ZodError([]), {
      includeValidationError: true,
      fallbackMessage: 'Failed.'
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
  });

  it('maps authorization errors to configured status', async () => {
    const response = toRouteErrorResponse(new AuthorizationError('No access.'), {
      authorizationStatus: 401,
      fallbackMessage: 'Failed.'
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'No access.' });
  });

  it('maps authorization errors to 403 by default', async () => {
    const response = toRouteErrorResponse(new AuthorizationError('Forbidden.'), {
      fallbackMessage: 'Failed.'
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden.' });
  });

  it('maps not found errors to 404 when enabled', async () => {
    const response = toRouteErrorResponse(new NotFoundError('Missing resource.'), {
      includeNotFoundError: true,
      fallbackMessage: 'Failed.'
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Missing resource.' });
  });

  it('returns fallback 500 for unknown errors', async () => {
    const response = toRouteErrorResponse(new Error('boom'), {
      includeValidationError: true,
      includeNotFoundError: true,
      fallbackMessage: 'Something went wrong.'
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Something went wrong.' });
  });
});
