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
} from '@nestjs/common';
import { ScheduledSubjectService } from './scheduled_subject.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CreateScheduledSubjectDto } from './dto/create_scheduled_subject.dto';
import { UpdateScheduledSubjectDto } from './dto/update_scheduled_subject.dto';
import { ScheduledSubjectResponseDto } from './dto/scheduled_subject.response.dto';

@ApiAuth()
@Controller('scheduled-subjects')
export class ScheduledSubjectQueryController {
  constructor(private readonly scheduledSubjectService: ScheduledSubjectService) {}

  @ApiEndpoint({
    summary: 'Combinar los horarios de varios cuatrimestres propios (ej. carreras en paralelo)',
    queries: [
      {
        name: 'termIds',
        description: 'IDs de cuatrimestre separados por coma',
        required: true,
      },
    ],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Horarios combinados',
        type: ScheduledSubjectResponseDto,
        isArray: true,
      },
      { status: 403, description: 'Alguno de los cuatrimestres no te pertenece' },
    ],
  })
  @Get()
  async findByTerms(
    @Query('termIds') termIds: string,
    @Request() req,
  ): Promise<ScheduledSubjectResponseDto[]> {
    const ids = (termIds || '')
      .split(',')
      .map((id) => +id)
      .filter((id) => !Number.isNaN(id));
    return this.scheduledSubjectService.findByTerms(ids, req.user.userId);
  }
}

@ApiAuth()
@Controller('terms/:termId/scheduled-subjects')
export class ScheduledSubjectController {
  constructor(private readonly scheduledSubjectService: ScheduledSubjectService) {}

  @ApiEndpoint({
    summary: 'Listar los horarios cargados en un cuatrimestre propio',
    params: [{ name: 'termId', description: 'ID del cuatrimestre', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Lista de materias con horario del cuatrimestre',
        type: ScheduledSubjectResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(
    @Param('termId') termId: string,
    @Request() req,
  ): Promise<ScheduledSubjectResponseDto[]> {
    return this.scheduledSubjectService.findByTerm(+termId, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Cargar el horario de una materia en un cuatrimestre propio',
    description:
      'Rechaza slots que se superpongan con otra materia del mismo cuatrimestre, salvo que vengan marcados isException',
    params: [{ name: 'termId', description: 'ID del cuatrimestre', required: true }],
    body: { type: CreateScheduledSubjectDto },
    secured: true,
    validateBody: true,
    responses: [
      { status: 201, description: 'Horario creado', type: ScheduledSubjectResponseDto },
      { status: 400, description: 'Ya cargada, de otra carrera, u horario superpuesto' },
      { status: 403, description: 'El cuatrimestre no te pertenece' },
    ],
  })
  @Post()
  async create(
    @Param('termId') termId: string,
    @Body() dto: CreateScheduledSubjectDto,
    @Request() req,
  ): Promise<ScheduledSubjectResponseDto> {
    return this.scheduledSubjectService.create(+termId, req.user.userId, dto);
  }

  @ApiEndpoint({
    summary: 'Actualizar el estado o los horarios de una materia agendada',
    params: [
      { name: 'termId', description: 'ID del cuatrimestre', required: true },
      { name: 'id', description: 'ID del registro de horario', required: true },
    ],
    body: { type: UpdateScheduledSubjectDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Horario actualizado',
        type: ScheduledSubjectResponseDto,
      },
    ],
  })
  @Put(':id')
  async update(
    @Param('termId') termId: string,
    @Param('id') id: string,
    @Body() updates: UpdateScheduledSubjectDto,
    @Request() req,
  ): Promise<ScheduledSubjectResponseDto> {
    return this.scheduledSubjectService.update(+termId, +id, req.user.userId, updates);
  }

  @ApiEndpoint({
    summary: 'Quitar el horario de una materia de un cuatrimestre',
    params: [
      { name: 'termId', description: 'ID del cuatrimestre', required: true },
      { name: 'id', description: 'ID del registro de horario', required: true },
    ],
    secured: true,
    responses: [{ status: 200, description: 'Horario eliminado' }],
  })
  @Delete(':id')
  async delete(
    @Param('termId') termId: string,
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.scheduledSubjectService.delete(+termId, +id, req.user.userId);
    return { message: 'ScheduledSubject deleted successfully' };
  }
}
