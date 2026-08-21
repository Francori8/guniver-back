// src/modules/Career/career.module.ts
import { Module } from '@nestjs/common';

import { CareerService } from './career.service';
import { CareerController } from './career.controller';
import { CareerRepository } from './career.repository';

import { UniversityModule } from '../University/university.module';
import { AuditLogModule } from '../AuditLog/audit_log.module';

@Module({
  imports: [UniversityModule, AuditLogModule],
  providers: [CareerService, CareerRepository],
  controllers: [CareerController],
  exports: [CareerRepository],
})
export class CareerModule {}
