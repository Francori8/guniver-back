import {
  BadRequestException,
  Controller,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RoleName } from 'src/shared/Types/roles.enum';
import { getRoleName } from 'src/shared/Types/get-role-name';
import { CloudinaryService } from './cloudinary.service';

const ADMIN_MAX_FILE_SIZE = 20 * 1024 * 1024;
const STUDENT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const STUDENT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
];

@ApiAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @ApiEndpoint({
    summary: 'Subir un archivo',
    description:
      'Sube un archivo a Cloudinary y devuelve la URL resultante, para usarla luego como resourceUrl de un StudyMaterial. Estudiantes tienen límites más estrictos que admins (10MB, solo PDF/docs/imágenes) que un admin (20MB, sin restricción de extensión).',
    secured: true,
    responses: [
      { status: 201, description: 'Archivo subido exitosamente' },
      { status: 400, description: 'No se envió ningún archivo, o no cumple los límites' },
    ],
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: ADMIN_MAX_FILE_SIZE },
    }),
  )
  @Post()
  async upload(@UploadedFile() file: Express.Multer.File | undefined, @Request() req) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }

    const isAdmin = getRoleName(req.user.role) === RoleName.ADMIN;

    if (!isAdmin) {
      if (file.size > STUDENT_MAX_FILE_SIZE) {
        throw new BadRequestException(
          `El archivo supera el límite de ${STUDENT_MAX_FILE_SIZE / 1024 / 1024}MB para uploads de estudiantes`,
        );
      }
      const extension = file.originalname
        .slice(file.originalname.lastIndexOf('.'))
        .toLowerCase();
      if (!STUDENT_ALLOWED_EXTENSIONS.includes(extension)) {
        throw new BadRequestException(
          `Extensión no permitida. Formatos aceptados: ${STUDENT_ALLOWED_EXTENSIONS.join(', ')}`,
        );
      }
    }

    return this.cloudinaryService.uploadBuffer(file.buffer, file.originalname);
  }
}
