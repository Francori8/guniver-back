import { Module } from '@nestjs/common';
import { StudyMaterialService } from './study_material.service';
import { StudyMaterialController } from './study_material.controller';
import { StudyMaterialRepository } from './study_material.repository';
import { SubjectModule } from '../Subject/subject.module';
import { UserModule } from '../User/user.module';
import { UploadsModule } from '../Uploads/uploads.module';

@Module({
  imports: [SubjectModule, UserModule, UploadsModule],
  providers: [StudyMaterialService, StudyMaterialRepository],
  controllers: [StudyMaterialController],
  exports: [StudyMaterialRepository],
})
export class StudyMaterialModule {}
