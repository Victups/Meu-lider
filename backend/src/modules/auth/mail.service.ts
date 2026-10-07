import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { CONFIG_DEFAULTS, CONFIG_KEYS } from '../../common/constants';

/**
 * Sends plain-text mail over SMTP. Without SMTP_HOST (local dev) the message is
 * logged instead, so the reset flow can be tried without a mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>(CONFIG_KEYS.SMTP_HOST);

    this.from = config.get<string>(CONFIG_KEYS.MAIL_FROM) ?? CONFIG_DEFAULTS.MAIL_FROM;
    this.transporter = host
      ? createTransport({
          host,
          port: Number(config.get<string>(CONFIG_KEYS.SMTP_PORT) ?? 587),
          auth: {
            user: config.get<string>(CONFIG_KEYS.SMTP_USER),
            pass: config.get<string>(CONFIG_KEYS.SMTP_PASSWORD),
          },
        })
      : null;
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP não configurado — e-mail para ${to}\n${subject}\n${text}`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
