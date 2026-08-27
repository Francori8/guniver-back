import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailBuilder } from './email-builder';
import { UserRepository } from '../User/user.repository';
import { RoleName } from 'src/shared/Types/roles.enum';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no configurado, los mails no se van a enviar',
      );
    }
    this.resend = new Resend(apiKey || 're_dummy_key');
  }

  private async send(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<void> {
    const from = this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev';
    const bcc = this.configService.get('RESEND_BCC');

    const { to: finalTo, subject: finalSubject } = this.redirectIfNotProduction(
      to,
      subject,
    );

    const { error } = await this.resend.emails.send({
      from,
      to: finalTo,
      subject: finalSubject,
      html,
      ...(bcc ? { bcc } : {}),
    });
    if (error) {
      this.logger.error(`Error enviando mail a ${finalTo}: ${error.message}`);
    }
  }

  /**
   * Fuera de producción (dev local, o cualquier entorno con datos reales
   * restaurados desde un dump), nunca se manda un mail a un destinatario real
   * — todo se redirige a ADMIN_NOTIFICATION_EMAIL para no spamear usuarios/admins
   * reales de la base de producción con notificaciones de pruebas locales.
   */
  private redirectIfNotProduction(
    to: string | string[],
    subject: string,
  ): { to: string | string[]; subject: string } {
    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv === 'production') {
      return { to, subject };
    }

    const redirectTo = this.configService.get('ADMIN_NOTIFICATION_EMAIL');
    if (!redirectTo) {
      this.logger.warn(
        `NODE_ENV=${nodeEnv ?? 'undefined'}: se debería redirigir el mail, pero ADMIN_NOTIFICATION_EMAIL no está configurado. Se envía al destinatario real igual.`,
      );
      return { to, subject };
    }

    const originalTo = Array.isArray(to) ? to.join(', ') : to;
    this.logger.warn(
      `NODE_ENV=${nodeEnv}: mail redirigido de [${originalTo}] a ${redirectTo}`,
    );
    return {
      to: redirectTo,
      subject: `[${nodeEnv ?? 'no-prod'}] ${subject} (originalmente a: ${originalTo})`,
    };
  }

  /**
   * Todos los usuarios con rol ADMIN, para notificaciones que le
   * corresponden a cualquiera de ellos (no a una única dirección fija).
   */
  private async getAdminEmails(): Promise<string[]> {
    const admins = await this.userRepository.findByRoleName(RoleName.ADMIN);
    return admins.map((admin) => admin.email);
  }

  private async sendToAdmins(subject: string, html: string): Promise<void> {
    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length === 0) {
      this.logger.warn('No hay usuarios ADMIN en la base, se omite el mail de aviso');
      return;
    }
    await this.send(adminEmails, subject, html);
  }

  async sendAccessRequestNotification(request: {
    firstName: string;
    lastName: string;
    email: string;
    message?: string;
  }): Promise<void> {
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

    await this.sendToAdmins(subject, html);
  }

  async sendCareerRequestNotification(request: {
    firstName: string;
    lastName: string;
    email: string;
    careerName: string;
    universityName: string;
  }): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');

    const builder = new EmailBuilder()
      .subject('Nueva solicitud de carrera')
      .heading('Un alumno pidió sumar una carrera')
      .paragraph(
        `<strong>${request.firstName} ${request.lastName}</strong> (${request.email}) pidió sumar la carrera <strong>${request.careerName}</strong> (${request.universityName}).`,
      );

    if (frontendUrl) {
      builder.button('Ver solicitudes', `${frontendUrl}/admin/career-requests`);
    }

    const { subject, html } = builder.build();

    await this.sendToAdmins(subject, html);
  }

  async sendMaterialPendingNotification(material: {
    title: string;
    uploaderFirstName: string;
    uploaderLastName: string;
    subjectName: string;
  }): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');

    const builder = new EmailBuilder()
      .subject('Nuevo material pendiente de revisión')
      .heading('Un estudiante subió un apunte')
      .paragraph(
        `<strong>${material.uploaderFirstName} ${material.uploaderLastName}</strong> subió "${material.title}" para ${material.subjectName}, pendiente de aprobación.`,
      );

    if (frontendUrl) {
      builder.button('Revisar materiales', `${frontendUrl}/admin/study-material-requests`);
    }

    const { subject, html } = builder.build();

    await this.sendToAdmins(subject, html);
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
