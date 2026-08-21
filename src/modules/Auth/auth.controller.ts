import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocalAuthGuard } from 'src/shared/guards/local_auth.guard';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt.guard';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ActivateAccountDto } from './dto/activate_account.dto';
import { ForgotPasswordDto } from './dto/forgot_password.dto';
import { ResetPasswordDto } from './dto/reset_password.dto';
import { ChangePasswordDto } from './dto/change_password.dto';
import { UserService } from '../User/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req) {
    const result = await this.authService.login(req.user);

    return {
      access_token: result.access_token,
      user: result.user,
      message: 'Login exitoso',
    };
  }

  @Post('activate-account')
  @ApiOperation({ summary: 'Activar cuenta y definir contraseña con el token de invitación' })
  @ApiBody({ type: ActivateAccountDto })
  async activateAccount(@Body() dto: ActivateAccountDto) {
    const result = await this.authService.activateAccount(dto.token, dto.password);

    return {
      access_token: result.access_token,
      user: result.user,
      message: 'Cuenta activada exitosamente',
    };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Pedir restablecimiento de contraseña',
    description:
      'Si el email existe, envía un mail con un link para elegir una nueva contraseña. Siempre responde éxito (no revela si el email existe).',
  })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Si el email existe, vas a recibir un mail con instrucciones.' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con el token recibido por mail' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.password);

    return {
      access_token: result.access_token,
      user: result.user,
      message: 'Contraseña restablecida exitosamente',
    };
  }

  @Post('change-password')
  @ApiAuth()
  @ApiOperation({ summary: 'Cambiar la contraseña estando logueado (requiere la actual)' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout() {
    return { message: 'Logout exitoso' };
  }

  @Get('me')
  @ApiAuth()
  async getCurrentUser(@Request() req) {
    const user = await this.userService.findOne(req.user.userId);
    return {
      message: 'Usuario actual',
      user,
    };
  }
}
