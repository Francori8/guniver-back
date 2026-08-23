import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { SubjectRepository } from './subject.repository';
import { CareerModule } from '../Career/career.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { RequirementModule } from '../Requirement/requirement.module';
import { AuditLogModule } from '../AuditLog/audit_log.module';

@Module({
  imports: [CareerModule, CareerSubjectModule, RequirementModule, AuditLogModule],
  providers: [SubjectService, SubjectRepository],
  controllers: [SubjectController],
  exports: [SubjectRepository],
})
export class SubjectModule {}
