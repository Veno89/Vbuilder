import { APIRequestContext, expect, test } from '@playwright/test';

const runFullE2E = process.env.E2E_RUN_FULL === '1';
const inboxToken = process.env.DEV_INBOX_TOKEN ?? 'dev-inbox-token';

function decodeToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractVerificationToken(notification: unknown): string | null {
  if (typeof notification !== 'object' || notification === null) {
    return null;
  }

  if ('verificationToken' in notification && typeof notification.verificationToken === 'string') {
    return decodeToken(notification.verificationToken);
  }

  if (!('html' in notification) || typeof notification.html !== 'string') {
    return null;
  }

  const html = notification.html;

  const hrefMatches = html.matchAll(/href=["']([^"']+)["']/gi);
  for (const match of hrefMatches) {
    const href = match[1];
    if (!href) {
      continue;
    }

    if (!URL.canParse(href, 'http://localhost')) {
      continue;
    }

    const parsedUrl = new URL(href, 'http://localhost');
    if (parsedUrl.pathname.endsWith('/verify-email') || parsedUrl.pathname.endsWith('/api/auth/verify-email')) {
      const token = parsedUrl.searchParams.get('token');
      if (token) {
        return token;
      }
    }
  }

  const regexToken = html.match(/[?&]token=([^"'&\s<]+)/i)?.[1];
  return regexToken ? decodeToken(regexToken) : null;
}

async function waitForVerificationToken(request: APIRequestContext, email: string): Promise<string> {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const response = await request.get(`/api/dev/notifications/latest?email=${encodeURIComponent(email)}`, {
      headers: {
        'x-dev-inbox-token': inboxToken
      }
    });

    if (response.status() === 200) {
      const body = await response.json();
      const token = extractVerificationToken(body.notification);

      if (token) {
        return token;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for verification token from dev notification inbox.');
}

test.describe('golden path: signup -> verify -> signin -> org create', () => {
  test.skip(!runFullE2E, 'Set E2E_RUN_FULL=1 with valid database env to run golden-path e2e.');

  test('completes core tenant bootstrap flow via API boundaries', async ({ request }) => {
    const unique = Date.now().toString();
    const email = `golden-${unique}@example.com`;
    const password = 'super-secure-password-123';

    const signupResponse = await request.post('/api/auth/signup', {
      data: { email, password }
    });
    expect(signupResponse.status()).toBe(201);

    const verificationToken = await waitForVerificationToken(request, email);

    const verifyResponse = await request.post('/api/auth/verify-email', {
      data: { token: verificationToken }
    });
    expect(verifyResponse.status()).toBe(200);

    const signinResponse = await request.post('/api/auth/signin', {
      data: { email, password }
    });
    expect(signinResponse.status()).toBe(200);

    const cookies = signinResponse.headers()['set-cookie'];
    expect(cookies).toBeTruthy();
    expect(cookies).toContain('vb_session=');

    const orgResponse = await request.post('/api/organizations/create', {
      data: { name: 'Golden Org', slug: `golden-org-${unique}` },
      headers: {
        cookie: cookies as string
      }
    });

    expect(orgResponse.status()).toBe(201);
    const orgPayload = await orgResponse.json();
    expect(orgPayload.organizationId).toBeTruthy();
  });
});
