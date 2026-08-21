// src/modules/Career/career.controller.ts
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
} from '@nestjs/common';
import { CareerService } from './career.service';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateCareerDto } from './dto/create_career.dto';
import { CareerResponseDto } from './dto/career.response.dto';
import { UpdateCareerDto } from './dto/update_career.dto';

@ApiAuth()
@Controller('careers')
export class CareerController {
  constructor(private readonly careerService: CareerService) {}

  @ApiEndpoint({
    summary: 'Crear una nueva carrera',
    description: 'Crea una nueva carrera en una universidad específica',
    body: {
      type: CreateCareerDto,
      description: 'Datos requeridos para crear una carrera',
    },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Carrera creada exitosamente',
        type: CareerResponseDto,
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
  @Post()
  async create(
    @Body() createCareerDto: CreateCareerDto,
  ): Promise<CareerResponseDto> {
    return this.careerService.create(createCareerDto);
  }

  @ApiEndpoint({
    summary: 'Obtener todas las carreras',
    description: 'Retorna una lista de todas las carreras registradas',
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Lista de carreras obtenida exitosamente',
        type: CareerResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.careerService.findAllPaginated(query.page ?? 1, query.limit ?? 20);
  }

  @ApiEndpoint({
    summary: 'Obtener una carrera por ID',
    description: 'Busca y retorna una carrera específica basada en su ID único',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la carrera',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Carrera encontrada',
        type: CareerResponseDto,
      },
      {
        status: 404,
        description: 'Carrera no encontrada',
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CareerResponseDto> {
    return this.careerService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Obtener carreras por universidad',
    description: 'Retorna todas las carreras de una universidad específica',
    secured: true,
    params: [
      {
        name: 'universityId',
        description: 'ID de la universidad',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de carreras obtenida exitosamente',
        type: CareerResponseDto,
        isArray: true,
      },
    ],
  })
  @Get('university/:universityId')
  async findByUniversity(
    @Param('universityId') universityId: string,
  ): Promise<CareerResponseDto[]> {
    return this.careerService.findByUniversity(+universityId);
  }

  @ApiEndpoint({
    summary: 'Obtener carreras por universidad (paginado)',
    description:
      'Retorna las carreras de una universidad específica con paginación, pensado para el panel admin',
    secured: true,
    params: [
      {
        name: 'universityId',
        description: 'ID de la universidad',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista paginada de carreras obtenida exitosamente',
      },
    ],
  })
  @Get('university/:universityId/paginated')
  async findByUniversityPaginated(
    @Param('universityId') universityId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.careerService.findByUniversityPaginated(
      +universityId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @ApiEndpoint({
    summary: 'Actualizar carrera',
    description: 'Actualiza la información de una carrera existente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la carrera a actualizar',
        required: true,
      },
    ],
    body: {
      type: UpdateCareerDto,
      description: 'Campos a actualizar de la carrera',
    },
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Carrera actualizada exitosamente',
        type: CareerResponseDto,
      },
      {
        status: 400,
        description: 'Datos de entrada inválidos',
      },
      {
        status: 404,
        description: 'Carrera o universidad no encontrada',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateCareerDto,
  ): Promise<CareerResponseDto> {
    return this.careerService.update(+id, updates);
  }

  @ApiEndpoint({
    summary: 'Eliminar carrera',
    description: 'Elimina una carrera del sistema de forma permanente',
    secured: true,
    params: [
      {
        name: 'id',
        description: 'ID único de la carrera a eliminar',
        required: true,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Carrera eliminada exitosamente',
      },
      {
        status: 404,
        description: 'Carrera no encontrada',
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.careerService.delete(+id);
    return { message: 'Career deleted successfully' };
  }
}
