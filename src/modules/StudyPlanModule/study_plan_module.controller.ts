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
import { StudyPlanModuleService } from './study_plan_module.service';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateStudyPlanModuleDto } from './dto/create_study_plan_module.dto';
import { UpdateStudyPlanModuleDto } from './dto/update_study_plan_module.dto';
import { StudyPlanModuleResponseDto } from './dto/study_plan_module.response.dto';

@ApiAuth()
@Controller('study-plan-modules')
export class StudyPlanModuleController {
  constructor(private readonly studyPlanModuleService: StudyPlanModuleService) {}

  @ApiEndpoint({
    summary: 'Crear un módulo de plan de estudios',
    description:
      'Crea un módulo (ej. "Ciclo Básico", "Núcleo de Orientación") dentro de una carrera',
    secured: true,
    body: { type: CreateStudyPlanModuleDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Módulo creado',
        type: StudyPlanModuleResponseDto,
      },
      { status: 400, description: 'Datos de entrada inválidos' },
      { status: 404, description: 'Carrera no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async create(
    @Body() createDto: CreateStudyPlanModuleDto,
    @Request() req,
  ): Promise<StudyPlanModuleResponseDto> {
    return this.studyPlanModuleService.create(createDto, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Listar módulos de una carrera',
    secured: true,
    queries: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de módulos',
        type: StudyPlanModuleResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findByCareer(
    @Query('careerId') careerId: string,
  ): Promise<StudyPlanModuleResponseDto[]> {
    return this.studyPlanModuleService.findByCareer(+careerId);
  }

  @ApiEndpoint({
    summary: 'Obtener un módulo por id',
    params: [{ name: 'id', description: 'ID del módulo', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Módulo encontrado',
        type: StudyPlanModuleResponseDto,
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<StudyPlanModuleResponseDto> {
    return this.studyPlanModuleService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Actualizar un módulo',
    params: [{ name: 'id', description: 'ID del módulo', required: true }],
    body: { type: UpdateStudyPlanModuleDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Módulo actualizado',
        type: StudyPlanModuleResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateStudyPlanModuleDto,
    @Request() req,
  ): Promise<StudyPlanModuleResponseDto> {
    return this.studyPlanModuleService.update(+id, updates, req.user.userId);
  }

  @ApiEndpoint({
    summary: 'Eliminar un módulo',
    params: [{ name: 'id', description: 'ID del módulo', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Módulo eliminado' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.studyPlanModuleService.delete(+id, req.user.userId);
    return { message: 'StudyPlanModule deleted successfully' };
  }
}
