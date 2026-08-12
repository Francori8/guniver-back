import { Module } from '@nestjs/common';
import { UniversityModule } from '../University/university.module';
import { CareerModule } from '../Career/career.module';
import { PublicController } from './public.controller';

@Module({
  imports: [UniversityModule, CareerModule],
  controllers: [PublicController],
})
export class PublicModule {}
