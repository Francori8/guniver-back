import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET no configurados, la subida de archivos va a fallar',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string; publicId: string; resourceType: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          // 'authenticated' + URL firmada esquiva el bloqueo por defecto que
          // Cloudinary aplica a la entrega pública de PDF/ZIP en cuentas nuevas.
          type: 'authenticated',
          folder: 'guniver/study-materials',
          filename_override: filename,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Error subiendo archivo a Cloudinary: ${error?.message}`);
            return reject(error);
          }

          const url = cloudinary.url(result.public_id, {
            resource_type: result.resource_type,
            type: 'authenticated',
            sign_url: true,
            version: result.version,
            format: result.format,
          });

          resolve({ url, publicId: result.public_id, resourceType: result.resource_type });
        },
      );

      uploadStream.end(buffer);
    });
  }

  async destroy(publicId: string, resourceType: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
      });
    } catch (error: any) {
      this.logger.error(`Error borrando ${publicId} de Cloudinary: ${error?.message}`);
    }
  }
}
