import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { SubjectProgressService } from './subject_progress.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CreateSubjectProgressDto } from './dto/create_subject_progress.dto';
import { UpdateSubjectProgressDto } from './dto/update_subject_progress.dto';
import { SubjectProgressResponseDto } from './dto/subject_progress.response.dto';

@ApiAuth()
@Controller('terms/:termId/subject-progress')
export class SubjectProgressController {
  constructor(private readonly subjectProgressService: SubjectProgressService) {}

  @ApiEndpoint({
    summary: 'Listar las materias cargadas en un cuatrimestre propio',
    params: [{ name: 'termId', description: 'ID del cuatrimestre', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Lista de progreso del cuatrimestre',
        type: SubjectProgressResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(
    @Param('termId') termId: string,
    @Request() req,
  ): Promise<SubjectProgressResponseDto[]> {
    return this.subjectProgressService.findByTerm(+termId, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Agregar una materia a un cuatrimestre propio',
    description:
      'Nunca bloquea por habilitación de correlativas: isException es solo trazabilidad',
    params: [{ name: 'termId', description: 'ID del cuatrimestre', required: true }],
    body: { type: CreateSubjectProgressDto },
    secured: true,
    validateBody: true,
    responses: [
      { status: 201, description: 'Progreso creado', type: SubjectProgressResponseDto },
      { status: 400, description: 'Ya cargada o de otra carrera' },
      { status: 403, description: 'El cuatrimestre no te pertenece' },
    ],
  })
  @Post()
  async create(
    @Param('termId') termId: string,
    @Body() dto: CreateSubjectProgressDto,
    @Request() req,
  ): Promise<SubjectProgressResponseDto> {
    return this.subjectProgressService.create(+termId, req.user.userId, dto);
  }

  @ApiEndpoint({
    summary: 'Actualizar el progreso de una materia',
    params: [
      { name: 'termId', description: 'ID del cuatrimestre', required: true },
      { name: 'id', description: 'ID del registro de progreso', required: true },
    ],
    body: { type: UpdateSubjectProgressDto },
    secured: true,
    validateBody: true,
    responses: [
      { status: 200, description: 'Progreso actualizado', type: SubjectProgressResponseDto },
    ],
  })
  @Put(':id')
  async update(
    @Param('termId') termId: string,
    @Param('id') id: string,
    @Body() updates: UpdateSubjectProgressDto,
    @Request() req,
  ): Promise<SubjectProgressResponseDto> {
    return this.subjectProgressService.update(+termId, +id, req.user.userId, updates);
  }

  @ApiEndpoint({
    summary: 'Quitar una materia de un cuatrimestre',
    params: [
      { name: 'termId', description: 'ID del cuatrimestre', required: true },
      { name: 'id', description: 'ID del registro de progreso', required: true },
    ],
    secured: true,
    responses: [{ status: 200, description: 'Progreso eliminado' }],
  })
  @Delete(':id')
  async delete(
    @Param('termId') termId: string,
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.subjectProgressService.delete(+termId, +id, req.user.userId);
    return { message: 'SubjectProgress deleted successfully' };
  }
}
