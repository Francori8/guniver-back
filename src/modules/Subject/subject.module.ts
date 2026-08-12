import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { SubjectRepository } from './subject.repository';
import { CareerModule } from '../Career/career.module';

@Module({
  imports: [CareerModule],
  providers: [SubjectService, SubjectRepository],
  controllers: [SubjectController],
  exports: [SubjectRepository],
})
export class SubjectModule {}
