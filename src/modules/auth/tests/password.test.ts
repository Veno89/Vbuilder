import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../domain/password';

describe('password hashing', () => {
  it('hashes and verifies a valid password', async () => {
    const hash = await hashPassword('SuperStrongPassword123!');
    await expect(verifyPassword('SuperStrongPassword123!', hash)).resolves.toBe(true);
  });

  it('rejects invalid password attempts', async () => {
    const hash = await hashPassword('SuperStrongPassword123!');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
