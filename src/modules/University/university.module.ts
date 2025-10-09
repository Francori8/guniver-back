// src/modules/University/university.module.ts
import { Module } from '@nestjs/common';

import { UniversityService } from './university.service';
import { UniversityController } from './university.controller';
import { UniversityRepository } from './university.repository';

@Module({
  imports: [],
  providers: [UniversityService, UniversityRepository],
  controllers: [UniversityController],
  exports: [UniversityService, UniversityRepository],
})
export class UniversityModule {}
