import { NextResponse } from 'next/server';
import { env } from '@/server/env';
import { getLatestNotification } from '@/modules/notifications/application/notification-inbox';

export async function GET(request: Request): Promise<Response> {
  if (env.NODE_ENV === 'production' || !env.NOTIFICATION_INBOX_ENABLED) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const token = request.headers.get('x-dev-inbox-token');
  if (token !== env.DEV_INBOX_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim();

  if (!email) {
    return NextResponse.json({ error: 'Email query parameter is required.' }, { status: 400 });
  }

  const latest = getLatestNotification(email);
  if (!latest) {
    return NextResponse.json({ error: 'No notification found.' }, { status: 404 });
  }

  return NextResponse.json({ notification: latest }, { status: 200 });
}
