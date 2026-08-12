import { Module } from '@nestjs/common';
import { CareerRequestRepository } from './career_request.repository';
import { UserModule } from '../User/user.module';
import { UniversityModule } from '../University/university.module';
import { CareerModule } from '../Career/career.module';
import { ProfileModule } from '../Profile/profile.module';

import { CreateCareerRequestController } from './use-cases/create-career-request/create-career-request.controller';
import { CreateCareerRequestService } from './use-cases/create-career-request/create-career-request.service';
import { ListCareerRequestsController } from './use-cases/list-career-requests/list-career-requests.controller';
import { ListCareerRequestsService } from './use-cases/list-career-requests/list-career-requests.service';
import { ApproveCareerRequestController } from './use-cases/approve-career-request/approve-career-request.controller';
import { ApproveCareerRequestService } from './use-cases/approve-career-request/approve-career-request.service';
import { RejectCareerRequestController } from './use-cases/reject-career-request/reject-career-request.controller';
import { RejectCareerRequestService } from './use-cases/reject-career-request/reject-career-request.service';

@Module({
  imports: [UserModule, UniversityModule, CareerModule, ProfileModule],
  controllers: [
    CreateCareerRequestController,
    ListCareerRequestsController,
    ApproveCareerRequestController,
    RejectCareerRequestController,
  ],
  providers: [
    CareerRequestRepository,
    CreateCareerRequestService,
    ListCareerRequestsService,
    ApproveCareerRequestService,
    RejectCareerRequestService,
  ],
  exports: [CareerRequestRepository],
})
export class CareerRequestModule {}
