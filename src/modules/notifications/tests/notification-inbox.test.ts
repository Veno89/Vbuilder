import { describe, expect, it } from 'vitest';
import {
  clearNotificationsForEmail,
  getLatestNotification,
  recordNotification
} from '../application/notification-inbox';

describe('notification-inbox', () => {
  it('stores optional verificationToken for captured emails', () => {
    const email = 'inbox-token@example.com';
    clearNotificationsForEmail(email);

    recordNotification({
      to: email,
      subject: 'Verify your email',
      html: '<a href="https://app.test/verify-email?token=abc">Verify</a>',
      verificationToken: 'abc'
    });

    const latest = getLatestNotification(email);
    expect(latest?.verificationToken).toBe('abc');

    clearNotificationsForEmail(email);
  });
});
