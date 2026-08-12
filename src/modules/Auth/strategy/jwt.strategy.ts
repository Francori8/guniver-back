import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Extractor personalizado: primero intenta cookies, luego Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Intentar obtener de cookies primero
          if (request?.cookies?.guniver_token) {
            return request.cookies.guniver_token;
          }
          return null;
        },
        // Fallback al header Authorization (para compatibilidad con Swagger)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'secretKey',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
