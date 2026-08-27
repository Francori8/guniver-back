import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudyPlanImportService } from './study_plan_import.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ConfirmStudyPlanImportDto } from './dto/confirm_study_plan_import.dto';
import { ConfirmStudyPlanImportResultDto } from './dto/confirm_study_plan_import_result.dto';
import { PreviewStudyPlanResponseDto } from './dto/preview_study_plan.response.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMETYPES = [
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

@ApiAuth()
@Controller('study-plan-import')
export class StudyPlanImportController {
  constructor(private readonly studyPlanImportService: StudyPlanImportService) {}

  @ApiEndpoint({
    summary: 'Previsualizar la importación de un plan de estudios (Excel del SIU)',
    description:
      'Solo admin. No persiste nada: parsea el Excel, matchea materias/módulos contra el catálogo existente y propone qué crear/reusar',
    secured: true,
    queries: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
    ],
    responses: [
      {
        status: 200,
        description: 'Preview del import',
        type: PreviewStudyPlanResponseDto,
      },
      { status: 400, description: 'Archivo inválido' },
      { status: 404, description: 'Carrera no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Query('careerId') careerId: string,
  ): Promise<PreviewStudyPlanResponseDto> {
    if (!file) {
      throw new BadRequestException('Falta el archivo Excel');
    }
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('El archivo debe ser un Excel (.xls o .xlsx)');
    }
    return this.studyPlanImportService.buildPreview(+careerId, file.buffer);
  }

  @ApiEndpoint({
    summary: 'Confirmar la importación de un plan de estudios',
    description:
      'Solo admin. Crea/reusa Subject, crea/reusa StudyPlanModule y crea los CareerSubject correspondientes',
    secured: true,
    body: { type: ConfirmStudyPlanImportDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Resumen de la importación',
        type: ConfirmStudyPlanImportResultDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmStudyPlanImportDto,
    @Request() req,
  ): Promise<ConfirmStudyPlanImportResultDto> {
    return this.studyPlanImportService.confirmImport(dto, req.user.userId);
  }
}
