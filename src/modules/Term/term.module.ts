import { Module } from '@nestjs/common';

import { TermService } from './term.service';
import { TermController } from './term.controller';
import { TermRepository } from './term.repository';

import { ProfileModule } from '../Profile/profile.module';

@Module({
  imports: [ProfileModule],
  providers: [TermService, TermRepository],
  controllers: [TermController],
  exports: [TermRepository, TermService],
})
export class TermModule {}
