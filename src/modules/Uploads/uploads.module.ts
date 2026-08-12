import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService],
  controllers: [UploadsController],
  exports: [CloudinaryService],
})
export class UploadsModule {}
