// src/modules/Profile/profile.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateProfileDto } from './dto/create_profile.dto';

@ApiAuth()
@Controller('user/:userId/profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiEndpoint({
    summary: 'Crear un perfil para usuario',
    description:
      'Crea un nuevo perfil (estudiante o administrador) para un usuario específico',
    secured: true,
    params: [
      {
        name: 'userId',
        description: 'ID único del usuario al que se le asignará el perfil',
        required: true,
      },
    ],
    body: {
      type: CreateProfileDto,
      description: 'Datos requeridos para crear el perfil',
    },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Perfil creado exitosamente',
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos o tipo de perfil incorrecto',
      },
      {
        status: 404,
        description: 'Usuario, universidad o carrera no encontrada',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async createProfile(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    return this.profileService.createProfile(userId, createProfileDto);
  }

  @ApiEndpoint({
    summary: 'Obtener perfiles de usuario',
    description:
      'Retorna todos los perfiles (estudiante y administrador) asociados a un usuario específico',
    secured: true,
    params: [
      {
        name: 'userId',
        description: 'ID único del usuario del cual obtener los perfiles',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Perfiles obtenidos exitosamente',
      },
      {
        status: 404,
        description: 'Usuario no encontrado',
      },
    ],
  })
  @Get()
  async getUserProfiles(@Param('userId', ParseIntPipe) userId: number) {
    return this.profileService.getUserProfiles(userId);
  }

  @ApiEndpoint({
    summary: 'Eliminar perfil de usuario',
    description:
      'Elimina un perfil específico (estudiante o administrador) de un usuario',
    secured: true,
    params: [
      {
        name: 'userId',
        description: 'ID único del usuario dueño del perfil',
        required: true,
      },
      {
        name: 'id',
        description: 'ID único del perfil a eliminar',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Perfil eliminado exitosamente',
      },
      {
        status: 404,
        description: 'Usuario o perfil no encontrado',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async deleteProfile(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.profileService.deleteProfile(userId, id);
    return { message: 'Profile deleted successfully' };
  }
}
