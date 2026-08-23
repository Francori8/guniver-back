import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CareerSubjectService } from './career_subject.service';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { UpdateCareerSubjectDto } from './dto/update_career_subject.dto';
import { CareerSubjectResponseDto } from './dto/career_subject.response.dto';

@ApiAuth()
@Controller('career-subjects')
export class CareerSubjectController {
  constructor(private readonly careerSubjectService: CareerSubjectService) {}

  @ApiEndpoint({
    summary: 'Listar materias de una carrera',
    description:
      'Soporta filtros: careerId (requerido) y subjectId (opcional, devuelve un único resultado)',
    secured: true,
    queries: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
      {
        name: 'subjectId',
        description: 'ID de la materia (filtra a un único resultado)',
        required: false,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de materias de la carrera',
        type: CareerSubjectResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findByCareer(
    @Query('careerId') careerId: string,
    @Query('subjectId') subjectId?: string,
  ): Promise<CareerSubjectResponseDto[] | CareerSubjectResponseDto> {
    if (subjectId) {
      return this.careerSubjectService.findByCareerAndSubject(
        +careerId,
        +subjectId,
      );
    }
    return this.careerSubjectService.findByCareer(+careerId);
  }

  @ApiEndpoint({
    summary: 'Obtener una relación materia-carrera por id',
    params: [{ name: 'id', description: 'ID de CareerSubject', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Relación encontrada',
        type: CareerSubjectResponseDto,
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CareerSubjectResponseDto> {
    return this.careerSubjectService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Actualizar módulo/créditos de una materia dentro de una carrera',
    params: [{ name: 'id', description: 'ID de CareerSubject', required: true }],
    body: { type: UpdateCareerSubjectDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Relación actualizada',
        type: CareerSubjectResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateCareerSubjectDto,
    @Request() req,
  ): Promise<CareerSubjectResponseDto> {
    return this.careerSubjectService.update(+id, updates, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Quitar una materia de una carrera',
    params: [{ name: 'id', description: 'ID de CareerSubject', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Relación eliminada' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.careerSubjectService.delete(+id, req.user.userId);
    return { message: 'CareerSubject deleted successfully' };
  }
}
