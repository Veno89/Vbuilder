import { createHash, randomBytes } from 'node:crypto';

export function generateRawToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function expiresAtFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}
