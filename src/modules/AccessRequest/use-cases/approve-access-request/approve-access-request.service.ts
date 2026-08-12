import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccessRequestRepository } from '../../access_request.repository';
import { AccessRequestStatus } from '../../entities/access_request.entity';
import { ApproveAccessRequestDto } from './approve-access-request.dto';
import { UserRepository } from 'src/modules/User/user.repository';
import { RoleRepository } from 'src/modules/Role/role.repository';
import { ProfileService } from 'src/modules/Profile/profile.service';
import { ProfileType } from 'src/modules/Profile/entity/profile.entity';
import { RoleName } from 'src/shared/Types/roles.enum';
import { MailService } from 'src/modules/Mail/mail.service';

const INVITE_TOKEN_TTL_HOURS = 72;

@Injectable()
export class ApproveAccessRequestService {
  constructor(
    private readonly accessRequestRepository: AccessRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly profileService: ProfileService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: number, dto: ApproveAccessRequestDto) {
    const accessRequest = await this.accessRequestRepository.findOne(id);
    if (!accessRequest) {
      throw new NotFoundException(`Access request with ID ${id} not found`);
    }
    if (accessRequest.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    const studentRole = await this.roleRepository.findByName(RoleName.STUDENT);
    if (!studentRole) {
      throw new NotFoundException(`Role ${RoleName.STUDENT} not found`);
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(
      Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );
    const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    const user = this.userRepository.create({
      email: accessRequest.email,
      firstName: accessRequest.firstName,
      lastName: accessRequest.lastName,
      password: unusablePassword,
      role: studentRole,
      isActive: false,
      inviteToken,
      inviteTokenExpiresAt,
    });
    await this.userRepository.save(user);

    await this.profileService.createProfile(user.id, {
      type: ProfileType.STUDENT,
      universityId: dto.universityId,
      careerId: dto.careerId,
      enrollmentDate: dto.enrollmentDate,
    });

    accessRequest.status = AccessRequestStatus.APPROVED;
    accessRequest.reviewedAt = new Date();
    await this.accessRequestRepository.save(accessRequest);

    const frontendUrl = this.configService.get('FRONTEND_URL');
    const activationUrl = `${frontendUrl}/activar-cuenta?token=${inviteToken}`;
    await this.mailService.sendActivationInvite(user.email, user.firstName, activationUrl);

    return { id: accessRequest.id, status: accessRequest.status, userId: user.id };
  }
}
