import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessRequestRepository } from './access_request.repository';
import { UserModule } from '../User/user.module';
import { RoleModule } from '../Role/role.module';
import { ProfileModule } from '../Profile/profile.module';
import { MailModule } from '../Mail/mail.module';
import { UniversityModule } from '../University/university.module';
import { CareerModule } from '../Career/career.module';

import { CreateAccessRequestController } from './use-cases/create-access-request/create-access-request.controller';
import { CreateAccessRequestService } from './use-cases/create-access-request/create-access-request.service';
import { ListAccessRequestsController } from './use-cases/list-access-requests/list-access-requests.controller';
import { ListAccessRequestsService } from './use-cases/list-access-requests/list-access-requests.service';
import { ApproveAccessRequestController } from './use-cases/approve-access-request/approve-access-request.controller';
import { ApproveAccessRequestService } from './use-cases/approve-access-request/approve-access-request.service';
import { RejectAccessRequestController } from './use-cases/reject-access-request/reject-access-request.controller';
import { RejectAccessRequestService } from './use-cases/reject-access-request/reject-access-request.service';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    RoleModule,
    ProfileModule,
    MailModule,
    UniversityModule,
    CareerModule,
  ],
  controllers: [
    CreateAccessRequestController,
    ListAccessRequestsController,
    ApproveAccessRequestController,
    RejectAccessRequestController,
  ],
  providers: [
    AccessRequestRepository,
    CreateAccessRequestService,
    ListAccessRequestsService,
    ApproveAccessRequestService,
    RejectAccessRequestService,
  ],
  exports: [AccessRequestRepository],
})
export class AccessRequestModule {}
