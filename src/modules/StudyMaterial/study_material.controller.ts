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
} from '@nestjs/common';
import { StudyMaterialService } from './study_material.service';

import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CreateStudyMaterialDto } from './dto/create_study_material.dto';
import { UpdateStudyMaterialDto } from './dto/update_study_material.dto';
import { StudyMaterialResponseDto } from './dto/study_material.response.dto';

@ApiAuth()
@Controller('study-materials')
export class StudyMaterialController {
  constructor(private readonly studyMaterialService: StudyMaterialService) {}

  @ApiEndpoint({
    summary: 'Crear material de estudio',
    secured: true,
    body: { type: CreateStudyMaterialDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Material creado',
        type: StudyMaterialResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  async create(
    @Body() createDto: CreateStudyMaterialDto,
  ): Promise<StudyMaterialResponseDto> {
    return this.studyMaterialService.create(createDto);
  }

  @ApiEndpoint({
    summary: 'Obtener materiales',
    description:
      'Soporta filtros: subjectId, type, uploaderId, popular (query params)',
    secured: true,
    queries: [
      {
        name: 'subjectId',
        description: 'Filtrar por materia',
        required: false,
      },
      {
        name: 'type',
        description: 'Filtrar por tipo de material',
        required: false,
      },
      {
        name: 'uploaderId',
        description: 'Filtrar por usuario uploader',
        required: false,
      },
      {
        name: 'popular',
        description: 'Obtener materiales más populares (true)',
        required: false,
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de materiales',
        type: StudyMaterialResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findAll(
    @Query('subjectId') subjectId?: string,
    @Query('type') type?: string,
    @Query('uploaderId') uploaderId?: string,
    @Query('popular') popular?: string,
  ): Promise<StudyMaterialResponseDto[]> {
    const filters: any = {};
    if (subjectId) filters.subjectId = +subjectId;
    if (type) filters.type = type;
    if (uploaderId) filters.uploaderId = +uploaderId;
    if (popular) filters.popular = popular === 'true';
    return this.studyMaterialService.findAll(filters);
  }

  @ApiEndpoint({
    summary: 'Obtener material por id',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Material encontrado',
        type: StudyMaterialResponseDto,
      },
    ],
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<StudyMaterialResponseDto> {
    return this.studyMaterialService.findOne(+id);
  }

  @ApiEndpoint({
    summary: 'Actualizar material',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    body: { type: UpdateStudyMaterialDto },
    secured: true,
    validateBody: true,
    responses: [
      {
        status: 200,
        description: 'Material actualizado',
        type: StudyMaterialResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateStudyMaterialDto,
  ): Promise<StudyMaterialResponseDto> {
    return this.studyMaterialService.update(+id, updates);
  }

  @ApiEndpoint({
    summary: 'Eliminar material',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Material eliminado' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.studyMaterialService.delete(+id);
    return { message: 'StudyMaterial deleted successfully' };
  }
}
