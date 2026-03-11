import { env } from '@/server/env';
import { NotificationService } from './notification.service';
import { ResendEmailProvider } from './resend-email.provider';

const resendProvider = new ResendEmailProvider(
  env.RESEND_API_KEY,
  env.EMAIL_FROM,
  env.RESEND_API_BASE_URL
);

const captureInboxMessages = env.NOTIFICATION_INBOX_ENABLED;

export const notificationService = new NotificationService(
  resendProvider,
  env.APP_URL,
  captureInboxMessages
);
