import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { SubjectService } from './subject.service';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateSubjectDto } from './dto/create_subject.dto';
import { UpdateSubjectDto } from './dto/update_subject.dto';
import { SubjectResponseDto } from './dto/subject.response.dto';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

@ApiAuth()
@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @ApiEndpoint({
    summary: 'Crear una nueva materia',
    secured: true,
    body: { type: CreateSubjectDto },
    validateBody: true,
    responses: [
      { status: 201, description: 'Materia creada', type: SubjectResponseDto },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async create(
    @Body() createDto: CreateSubjectDto,
    @Request() req,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.create(createDto, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Obtener materias',
    description: 'Soporta filtros: careerId (query) y q (nombre) ',
    secured: true,
    queries: [
      {
        name: 'careerId',
        description: 'Filtrar por id de carrera',
        required: false,
      },
      { name: 'q', description: 'Buscar por nombre', required: false },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de materias',
        type: SubjectResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('careerId') careerId?: string,
    @Query('q') q?: string,
  ) {
    const filters: { careerId?: number; q?: string } = {};
    if (careerId) filters.careerId = +careerId;
    if (q) filters.q = q;
    return this.subjectService.findAllPaginated(
      query.page ?? 1,
      query.limit ?? 20,
      filters,
    );
  }

  @ApiEndpoint({
    summary: 'Obtener materia por id',
    params: [{ name: 'id', description: 'ID de la materia', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Materia encontrada',
        type: SubjectResponseDto,
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SubjectResponseDto> {
    return this.subjectService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Actualizar materia',
    params: [{ name: 'id', description: 'ID de la materia', required: true }],
    body: { type: UpdateSubjectDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Materia actualizada',
        type: SubjectResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateSubjectDto,
    @Request() req,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.update(+id, updates, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Eliminar materia',
    params: [{ name: 'id', description: 'ID de la materia', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Materia eliminada' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.subjectService.delete(+id, req.user.userId);
    return { message: 'Subject deleted successfully' };
  }
}
