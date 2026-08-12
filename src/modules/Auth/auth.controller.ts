import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocalAuthGuard } from 'src/shared/guards/local_auth.guard';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt.guard';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ActivateAccountDto } from './dto/activate_account.dto';
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
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);

    // Configurar cookie HttpOnly con el token (para frontend web)
    res.cookie('guniver_token', result.access_token, {
      httpOnly: true, // No accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax', // Protección CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
      path: '/', // Disponible en toda la app
    });

    // Devolver token en la respuesta (para Swagger/Postman) + info del usuario
    return {
      access_token: result.access_token, // ← Para compatibilidad con Swagger
      user: result.user,
      message: 'Login exitoso',
    };
  }

  @Post('activate-account')
  @ApiOperation({ summary: 'Activar cuenta y definir contraseña con el token de invitación' })
  @ApiBody({ type: ActivateAccountDto })
  async activateAccount(
    @Body() dto: ActivateAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.activateAccount(dto.token, dto.password);

    res.cookie('guniver_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      access_token: result.access_token,
      user: result.user,
      message: 'Cuenta activada exitosamente',
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Res({ passthrough: true }) res: Response) {
    // Eliminar la cookie
    res.clearCookie('guniver_token', { path: '/' });
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
