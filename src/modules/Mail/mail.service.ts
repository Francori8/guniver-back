import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailBuilder } from './email-builder';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no configurado, los mails no se van a enviar',
      );
    }
    this.resend = new Resend(apiKey || 're_dummy_key');
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev';
    const bcc = this.configService.get('RESEND_BCC');

    const { error } = await this.resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(bcc ? { bcc } : {}),
    });
    if (error) {
      this.logger.error(`Error enviando mail a ${to}: ${error.message}`);
    }
  }

  async sendAccessRequestNotification(request: {
    firstName: string;
    lastName: string;
    email: string;
    message?: string;
  }): Promise<void> {
    const adminEmail = this.configService.get('ADMIN_NOTIFICATION_EMAIL');
    if (!adminEmail) {
      this.logger.warn(
        'ADMIN_NOTIFICATION_EMAIL no configurado, se omite el mail de aviso',
      );
      return;
    }

    const frontendUrl = this.configService.get('FRONTEND_URL');

    const builder = new EmailBuilder()
      .subject('Nueva solicitud de acceso')
      .heading('Tenés una nueva solicitud de acceso')
      .paragraph(
        `<strong>${request.firstName} ${request.lastName}</strong> (${request.email}) pidió acceso a Guniverse.`,
      )
      .paragraph(request.message ? `Mensaje: "${request.message}"` : 'Sin mensaje adicional.');

    if (frontendUrl) {
      builder.button('Ver solicitudes', `${frontendUrl}/admin/access-requests`);
    }

    const { subject, html } = builder.build();

    await this.send(adminEmail, subject, html);
  }

  async sendActivationInvite(
    email: string,
    firstName: string,
    activationUrl: string,
  ): Promise<void> {
    const { subject, html } = new EmailBuilder()
      .subject('Activá tu cuenta en Guniverse')
      .heading(`¡Bienvenido/a a Guniverse, ${firstName}!`)
      .paragraph(
        'Tu solicitud de acceso fue aprobada. Hacé clic en el siguiente botón para crear tu contraseña y activar tu cuenta.',
      )
      .button('Activar mi cuenta', activationUrl)
      .paragraph('Este link vence en 72 horas.')
      .build();

    await this.send(email, subject, html);
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
  ): Promise<void> {
    const { subject, html } = new EmailBuilder()
      .subject('Restablecé tu contraseña en Guniverse')
      .heading(`Hola, ${firstName}`)
      .paragraph(
        'Pediste restablecer tu contraseña. Hacé clic en el siguiente botón para elegir una nueva.',
      )
      .button('Restablecer contraseña', resetUrl)
      .paragraph('Si vos no pediste esto, podés ignorar este mail. Este link vence en 1 hora.')
      .build();

    await this.send(email, subject, html);
  }
}
