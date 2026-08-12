import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del decorator
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario esté presente (debería haber sido cargado por JwtAuthGuard)
    if (!user) {
      throw new ForbiddenException(
        'No se pudo verificar la identidad del usuario',
      );
    }

    // Verificar que el usuario tenga al menos uno de los roles requeridos
    const hasRole = requiredRoles.some((role) => {
      // Si el rol en el user es un objeto, chequeamos su nombre
      if (typeof user.role === 'object' && user.role !== null) {
        return user.role.name === role;
      }
      // Si el rol en el user es un string (viene directo del JWT a veces), chequeamos directamente
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        'No tenés permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
