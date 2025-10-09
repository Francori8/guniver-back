// src/modules/Career/career.module.ts
import { Module } from '@nestjs/common';

import { CareerService } from './career.service';
import { CareerController } from './career.controller';
import { CareerRepository } from './career.repository';

import { UniversityModule } from '../University/university.module';

@Module({
  imports: [UniversityModule],
  providers: [CareerService, CareerRepository],
  controllers: [CareerController],
  exports: [CareerService],
})
export class CareerModule {}
