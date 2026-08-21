// src/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
// ← Corregí la coma
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user,dto';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';

@ApiAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiEndpoint({
    summary: 'Crear un nuevo usuario',
    description:
      'Crea un nuevo usuario en el sistema con los datos proporcionados',
    body: {
      type: CreateUserDto,
      description: 'Datos requeridos para crear un usuario',
    },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Usuario creado exitosamente',
        type: UserResponseDto,
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos',
      },
      {
        status: 409,
        description: 'El usuario ya existe',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.createUser(createUserDto);
  }

  @ApiEndpoint({
    summary: 'Obtener todos los usuarios',
    description:
      'Retorna una lista de todos los usuarios registrados en el sistema',
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Lista de usuarios obtenida exitosamente',
        type: UserResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAllPaginated(query.page ?? 1, query.limit ?? 20);
  }

  @ApiEndpoint({
    summary: 'Obtener un usuario por ID',
    description: 'Busca y retorna un usuario específico basado en su ID único',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único del usuario',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Usuario encontrado',
        type: UserResponseDto,
      },
      {
        status: 404,
        description: 'Usuario no encontrado',
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Hashear contraseñas existentes',
    description:
      'Endpoint temporal para hashear todas las contraseñas existentes en la base de datos. Solo para uso administrativo.',
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Contraseñas hasheadas exitosamente',
      },
      {
        status: 500,
        description: 'Error interno del servidor',
      },
    ],
  })
  @Post('hash-passwords')
  async hashPasswords() {
    return this.userService.hashExistingPasswords();
  }

  @ApiEndpoint({
    summary: 'Actualizar usuario',
    description: 'Actualiza la información de un usuario existente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único del usuario a actualizar',
        required: true,
      },
    ],
    body: {
      type: UpdateUserDto,
      description: 'Campos a actualizar del usuario',
    },
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Usuario actualizado exitosamente',
        type: UserResponseDto,
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos',
      },
      {
        status: 404,
        description: 'Usuario no encontrado',
      },
    ],
  })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(+id, updates);
  }

  @ApiEndpoint({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema de forma permanente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único del usuario a eliminar',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Usuario eliminado exitosamente',
      },
      {
        status: 404,
        description: 'Usuario no encontrado',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.userService.deleteUser(+id);
    return { message: 'User deleted successfully' };
  }
}
