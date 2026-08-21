// src/modules/University/university.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UniversityService } from './university.service';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateUniversityDto } from './dtos/create_university.dto';
import { UniversityResponseDto } from './dtos/university.response.dto';
import { UpdateUniversityDto } from './dtos/update_university.dto';

@ApiAuth()
@Controller('universities')
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @ApiEndpoint({
    summary: 'Crear una nueva universidad',
    description: 'Crea una nueva universidad en el sistema',
    body: {
      type: CreateUniversityDto,
      description: 'Datos requeridos para crear una universidad',
    },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Universidad creada exitosamente',
        type: UniversityResponseDto,
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async create(
    @Body() createUniversityDto: CreateUniversityDto,
    @Request() req,
  ): Promise<UniversityResponseDto> {
    return this.universityService.create(createUniversityDto, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Obtener todas las universidades',
    description: 'Retorna una lista de todas las universidades registradas',
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Lista de universidades obtenida exitosamente',
        type: UniversityResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.universityService.findAllPaginated(
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @ApiEndpoint({
    summary: 'Obtener una universidad por ID',
    description:
      'Busca y retorna una universidad específica basada en su ID único',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la universidad',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Universidad encontrada',
        type: UniversityResponseDto,
      },
      {
        status: 404,
        description: 'Universidad no encontrada',
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UniversityResponseDto> {
    return this.universityService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Actualizar universidad',
    description: 'Actualiza la información de una universidad existente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la universidad a actualizar',
        required: true,
      },
    ],
    body: {
      type: UpdateUniversityDto,
      description: 'Campos a actualizar de la universidad',
    },
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Universidad actualizada exitosamente',
        type: UniversityResponseDto,
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos',
      },
      {
        status: 404,
        description: 'Universidad no encontrada',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateUniversityDto,
    @Request() req,
  ): Promise<UniversityResponseDto> {
    return this.universityService.update(+id, updates, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Eliminar universidad',
    description: 'Elimina una universidad del sistema de forma permanente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la universidad a eliminar',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Universidad eliminada exitosamente',
      },
      {
        status: 404,
        description: 'Universidad no encontrada',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.universityService.delete(+id, req.user.userId);
    return { message: 'University deleted successfully' };
  }
}
