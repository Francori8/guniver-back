import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AcademicHistoryService } from './academic_history.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { ConfirmImportDto } from './dto/confirm_import.dto';
import { ConfirmImportResultDto } from './dto/confirm_import_result.dto';
import { PreviewResponseDto } from './dto/preview_response.dto';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

@ApiAuth()
@Controller('academic-history')
export class AcademicHistoryController {
  constructor(private readonly academicHistoryService: AcademicHistoryService) {}

  @ApiEndpoint({
    summary: 'Previsualizar la importación de un historial académico (PDF del SIU)',
    description:
      'No persiste nada: parsea el PDF, matchea materias contra todas las carreras del usuario y arma una propuesta de Terms/SubjectProgress agrupada por carrera para revisar antes de confirmar',
    secured: true,
    responses: [
      { status: 200, description: 'Preview del import', type: PreviewResponseDto },
      { status: 400, description: 'Archivo inválido' },
      { status: 404, description: 'No tenés ningún perfil de estudiante' },
    ],
  })
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_SIZE },
    }),
  )
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<PreviewResponseDto> {
    if (!file) {
      throw new BadRequestException('Falta el archivo PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('El archivo debe ser un PDF');
    }
    return this.academicHistoryService.buildPreview(req.user.userId, file.buffer);
  }

  @ApiEndpoint({
    summary: 'Confirmar la importación de historial académico',
    description:
      'Persiste los Terms/SubjectProgress ya revisados y editados por el usuario en el preview',
    secured: true,
    body: { type: ConfirmImportDto },
    validateBody: true,
    responses: [
      {
        status: 201,
        description: 'Resumen de la importación',
        type: ConfirmImportResultDto,
      },
    ],
  })
  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmImportDto,
    @Request() req,
  ): Promise<ConfirmImportResultDto> {
    return this.academicHistoryService.confirmImport(req.user.userId, dto);
  }
}
