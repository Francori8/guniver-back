import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserService } from '../User/user.service';
import { UserRepository } from '../User/user.repository';
import { MailService } from '../Mail/mail.service';

const RESET_TOKEN_TTL_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private userService: UserRepository,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    // ✅ AGREGAR ESTAS VALIDACIONES
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.password) {
      throw new UnauthorizedException('Contraseña no configurada');
    }

    if (!password) {
      throw new UnauthorizedException('Contraseña requerida');
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async activateAccount(token: string, password: string) {
    const user = await this.userService.findByInviteToken(token);
    if (!user) {
      throw new BadRequestException('El link de activación no es válido');
    }
    if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('El link de activación venció');
    }

    user.password = await bcrypt.hash(password, 10);
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteTokenExpiresAt = undefined;
    await this.userService.save(user);

    return this.login(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    // No revelar si el email existe o no: el caller siempre recibe éxito.
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.inviteToken = resetToken;
    user.inviteTokenExpiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );
    await this.userService.save(user);

    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
  }

  async resetPassword(token: string, password: string) {
    const user = await this.userService.findByInviteToken(token);
    if (!user) {
      throw new BadRequestException('El link de restablecimiento no es válido');
    }
    if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('El link de restablecimiento venció');
    }

    user.password = await bcrypt.hash(password, 10);
    user.inviteToken = undefined;
    user.inviteTokenExpiresAt = undefined;
    await this.userService.save(user);

    return this.login(user);
  }
}
