import { Module } from '@nestjs/common';
import { StudyMaterialService } from './study_material.service';
import { StudyMaterialController } from './study_material.controller';
import { StudyMaterialRepository } from './study_material.repository';
import { SubjectModule } from '../Subject/subject.module';
import { UserModule } from '../User/user.module';

@Module({
  imports: [SubjectModule, UserModule],
  providers: [StudyMaterialService, StudyMaterialRepository],
  controllers: [StudyMaterialController],
  exports: [StudyMaterialRepository],
})
export class StudyMaterialModule {}
