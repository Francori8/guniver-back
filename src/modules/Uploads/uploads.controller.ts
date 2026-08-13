import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { CloudinaryService } from './cloudinary.service';

@ApiAuth()
@UseGuards(RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @ApiEndpoint({
    summary: 'Subir un archivo',
    description:
      'Sube un archivo (PDF/apunte) a Cloudinary y devuelve la URL resultante, para usarla luego como resourceUrl de un StudyMaterial.',
    secured: true,
    responses: [
      { status: 201, description: 'Archivo subido exitosamente' },
      { status: 400, description: 'No se envió ningún archivo' },
    ],
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @Post()
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }
    return this.cloudinaryService.uploadBuffer(file.buffer, file.originalname);
  }
}
