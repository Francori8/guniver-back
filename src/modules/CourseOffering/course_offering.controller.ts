import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CourseOfferingService } from './course_offering.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { TermPeriod } from '../Term/term.entity';
import { PreviewCourseOfferingResponseDto } from './dto/preview_course_offering.response.dto';
import { ConfirmCourseOfferingImportDto } from './dto/confirm_course_offering_import.dto';
import { ConfirmCourseOfferingImportResultDto } from './dto/confirm_course_offering_import_result.dto';
import { CourseOfferingResponseDto } from './dto/course_offering.response.dto';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

@ApiAuth()
@Controller('course-offerings')
export class CourseOfferingController {
  constructor(private readonly courseOfferingService: CourseOfferingService) {}

  @ApiEndpoint({
    summary: 'Listar la oferta de comisiones de una carrera para un cuatrimestre',
    description:
      'Catálogo compartido: comisiones ya importadas por un admin, usadas para autocompletar horarios al agendar una materia',
    secured: true,
    queries: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
      { name: 'year', description: 'Año', required: true },
      { name: 'period', description: 'first | second', required: true },
    ],
    responses: [
      {
        status: 200,
        description: 'Comisiones ofertadas',
        type: CourseOfferingResponseDto,
        isArray: true,
      },
    ],
  })
  @Get()
  async findByCareer(
    @Query('careerId') careerId: string,
    @Query('year') year: string,
    @Query('period') period: TermPeriod,
  ): Promise<CourseOfferingResponseDto[]> {
    return this.courseOfferingService.findByCareer(+careerId, +year, period);
  }

  @ApiEndpoint({
    summary: 'Previsualizar la importación de oferta de comisiones (PDF de la universidad)',
    description:
      'Solo admin. No persiste nada: parsea el PDF, matchea materias contra el catálogo de la carrera indicada y propone las comisiones con sus horarios para revisar antes de confirmar',
    secured: true,
    queries: [{ name: 'careerId', description: 'ID de la carrera de destino', required: true }],
    responses: [
      { status: 200, description: 'Preview del import', type: PreviewCourseOfferingResponseDto },
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
      limits: { fileSize: MAX_PDF_SIZE },
    }),
  )
  async preview(
    @Query('careerId') careerId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PreviewCourseOfferingResponseDto> {
    if (!file) {
      throw new BadRequestException('Falta el archivo PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('El archivo debe ser un PDF');
    }
    return this.courseOfferingService.buildPreview(+careerId, file.buffer);
  }

  @ApiEndpoint({
    summary: 'Confirmar la importación de oferta de comisiones',
    description: 'Solo admin. Persiste las comisiones ya revisadas y editadas en el preview',
    secured: true,
    body: { type: ConfirmCourseOfferingImportDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Resumen de la importación',
        type: ConfirmCourseOfferingImportResultDto,
      },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmCourseOfferingImportDto,
  ): Promise<ConfirmCourseOfferingImportResultDto> {
    return this.courseOfferingService.confirmImport(dto);
  }
}
