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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
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
