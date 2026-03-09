import { NextResponse } from 'next/server';
import { hashToken } from '@/modules/auth/domain/token';
import { sessionRepository } from '@/modules/auth/application/auth-container';

const sessionCookieName = 'vb_session';

export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
    ?.split('=')[1];

  if (token) {
    await sessionRepository.revokeByTokenHash(hashToken(token));
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    expires: new Date(0),
    path: '/'
  });
  return response;
}
