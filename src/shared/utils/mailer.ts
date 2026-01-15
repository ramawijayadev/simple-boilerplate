import nodemailer from 'nodemailer';
import { logger } from './logger';

import { config } from '@/config';

const mailTransporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  ignoreTLS: true,
});

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return; // Skip in tests

  try {
    await mailTransporter.sendMail({
      from: '"No Reply" <noreply@example.com>',
      to,
      subject,
      text,
    });
  } catch (error) {
    // Log but don't fail operation
    logger.error({ err: error, to, subject }, 'Failed to send email');
  }
}
