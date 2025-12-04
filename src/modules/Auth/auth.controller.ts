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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Res({ passthrough: true }) res: Response) {
    // Eliminar la cookie
    res.clearCookie('guniver_token', { path: '/' });
    return { message: 'Logout exitoso' };
  }

  @Get('me')
  @ApiAuth()
  getCurrentUser(@Request() req) {
    return {
      message: 'Usuario actual',
      user: req.user,
    };
  }
}
