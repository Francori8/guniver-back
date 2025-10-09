import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt.guard';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';

@ApiAuth()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiEndpoint({
    summary: 'Crear un nuevo rol',
    description: 'Crea un nuevo rol en el sistema con los datos proporcionados',
    body: {
      type: CreateRoleDto,
      description: 'Datos necesarios para crear un rol',
    },

    validateBody: true, // ← Activa ValidationPipe automáticamente
    responses: [
      {
        status: 201,
        description: 'El rol fue creado exitosamente',
        type: Role,
      },
    ],
  })
  create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiEndpoint({
    summary: 'Obtener todos los roles',
    description:
      'Retorna una lista de todos los roles disponibles en el sistema',

    responses: [
      {
        status: 200,
        description: 'Lista de roles obtenida exitosamente',
        type: Role,
        isArray: true,
      },
    ],
  })
  findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get(':id')
  @ApiEndpoint({
    summary: 'Obtener un rol por ID',
    description: 'Busca y retorna un rol específico basado en su ID',

    params: [
      {
        name: 'id',
        description: 'ID único del rol',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Rol encontrado',
        type: Role,
      },
      {
        status: 404,
        description: 'Rol no encontrado',
      },
    ],
  })
  findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findById(+id);
  }
}
