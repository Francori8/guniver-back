import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
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
import { ReorderStudyMaterialDto } from './dto/reorder_study_material.dto';

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
    @Request() req,
  ): Promise<StudyMaterialResponseDto> {
    return this.studyMaterialService.create(createDto, req.user.userId);
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
    summary: 'Ver la papelera de materiales',
    description: 'Lista los materiales borrados (soft delete), pendientes de restaurar o borrar en serio.',
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Materiales en la papelera',
        type: StudyMaterialResponseDto,
        isArray: true,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('trash')
  async findTrash(): Promise<StudyMaterialResponseDto[]> {
    return this.studyMaterialService.findTrash();
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
    summary: 'Reordenar materiales',
    description:
      'Actualiza el campo order de varios materiales a la vez, para persistir un reordenamiento manual (drag & drop) dentro de un mismo tipo.',
    secured: true,
    body: { type: ReorderStudyMaterialDto },
    validateBody: true,
    responses: [{ status: 200, description: 'Orden actualizado' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch('reorder')
  async reorder(@Body() dto: ReorderStudyMaterialDto): Promise<{ message: string }> {
    await this.studyMaterialService.reorder(dto.items);
    return { message: 'Orden actualizado' };
  }

  @ApiEndpoint({
    summary: 'Registrar una visualización del material',
    description: 'Incrementa viewCount. Se llama al abrir/previsualizar el material.',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Visualización registrada' }],
  })
  @Patch(':id/view')
  async registerView(@Param('id') id: string): Promise<{ message: string }> {
    await this.studyMaterialService.registerView(+id);
    return { message: 'Visualización registrada' };
  }

  @ApiEndpoint({
    summary: 'Registrar una descarga del material',
    description: 'Incrementa downloadCount. Se llama al hacer click en Descargar.',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Descarga registrada' }],
  })
  @Patch(':id/download')
  async registerDownload(@Param('id') id: string): Promise<{ message: string }> {
    await this.studyMaterialService.registerDownload(+id);
    return { message: 'Descarga registrada' };
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
    summary: 'Enviar material a la papelera',
    description: 'Soft delete: deja de verse en la app pero se puede restaurar.',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Material enviado a la papelera' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.studyMaterialService.delete(+id);
    return { message: 'StudyMaterial deleted successfully' };
  }

  @ApiEndpoint({
    summary: 'Restaurar material de la papelera',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [
      {
        status: 200,
        description: 'Material restaurado',
        type: StudyMaterialResponseDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<StudyMaterialResponseDto> {
    return this.studyMaterialService.restore(+id);
  }

  @ApiEndpoint({
    summary: 'Eliminar material permanentemente',
    description: 'Borra el registro y, si tiene archivo propio, también lo borra de Cloudinary.',
    params: [{ name: 'id', description: 'ID del material', required: true }],
    secured: true,
    responses: [{ status: 200, description: 'Material eliminado permanentemente' }],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id/permanent')
  async permanentDelete(@Param('id') id: string): Promise<{ message: string }> {
    await this.studyMaterialService.permanentDelete(+id);
    return { message: 'StudyMaterial permanently deleted' };
  }
}
