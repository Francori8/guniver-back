import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { UserRepository } from '../User/user.repository';
import { UniversityRepository } from '../University/university.repository';
import { CareerRepository } from '../Career/career.repository';

import { StudentProfile } from './entity/student_profile.entity';
import { AdminProfile, PermissionLevel } from './entity/admin_profile.entity';
import { StudentProfileRepository } from './repository/student_profile.repository';
import { AdminProfileRepository } from './repository/admin_profile.repository';
import { CreateProfileDto } from './dto/create_profile.dto';
import { ProfileType } from './entity/profile.entity';
import { University } from '../University/university.entity';
import { User } from '../User/user.entity';
import { RoleName } from 'src/shared/Types/roles.enum';

@Injectable()
export class ProfileService {
  constructor(
    private readonly studentProfileRepository: StudentProfileRepository,
    private readonly adminProfileRepository: AdminProfileRepository,
    private readonly userRepository: UserRepository,
    private readonly universityRepository: UniversityRepository,
    private readonly careerRepository: CareerRepository,
  ) {}

  async createProfile(
    userId: number,
    createProfileDto: CreateProfileDto,
  ): Promise<StudentProfile | AdminProfile> {
    const handleMap = {
      [ProfileType.ADMIN]: (
        user: User,
        university: University,
        createProfileDto: CreateProfileDto,
      ) => this.createAdminProfile(user, university, createProfileDto),
      [ProfileType.STUDENT]: (
        user: User,
        university: University,
        createProfileDto: CreateProfileDto,
      ) => this.createStudentProfile(user, university, createProfileDto),
      default: () => {
        throw new BadRequestException('El tipo no es valido');
      },
    };

    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const university = await this.universityRepository.findOne(
      createProfileDto.universityId,
    );
    if (!university) {
      throw new NotFoundException(
        `University with ID ${createProfileDto.universityId} not found`,
      );
    }

    return await handleMap[createProfileDto.type](
      user,
      university,
      createProfileDto,
    );
  }

  private async createStudentProfile(
    user: any,
    university: any,
    dto: CreateProfileDto,
  ): Promise<StudentProfile> {
    if (!dto.careerId) {
      throw new BadRequestException(
        'Career ID is required for student profile',
      );
    }

    if (!dto.enrollmentDate) {
      throw new BadRequestException(
        'Enrollment date is required for student profile',
      );
    }

    const career = await this.careerRepository.findOne(dto.careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${dto.careerId} not found`);
    }

    const studentProfile = this.studentProfileRepository.create({
      user,
      university,
      career,
      enrollmentDate: dto.enrollmentDate,
      type: ProfileType.STUDENT,
      isActive: true,
    });

    await this.studentProfileRepository.save(studentProfile);
    return studentProfile;
  }

  private async createAdminProfile(
    user: User,
    university: University,
    dto: CreateProfileDto,
  ): Promise<AdminProfile> {
    const adminProfile = this.adminProfileRepository.create({
      user,
      university,
      permissionLevel: dto.permissionLevel || PermissionLevel.FULL,
      type: ProfileType.ADMIN,
      isActive: true,
    });

    await this.adminProfileRepository.save(adminProfile);
    return adminProfile;
  }

  async deleteProfile(userId: number, profileId: number): Promise<void> {
    const user = await this.userRepository.findByIdWithProfiles(userId);
    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    const profileStudent =
      await this.studentProfileRepository.findOne(profileId);
    if (profileStudent) {
      await this.studentProfileRepository.removeAndFlush(profileStudent);
      return;
    }

    const profileAdmin = await this.adminProfileRepository.findOne(profileId);
    if (profileAdmin) {
      await this.adminProfileRepository.removeAndFlush(profileAdmin);
      return;
    }

    throw new NotFoundException(`Profile with ID ${profileId} not found`);
  }

  async getUserProfiles(userId: number) {
    const user = await this.userRepository.findByIdWithProfiles(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      studentProfiles: user.studentProfiles.getItems(),
      adminProfiles: user.adminProfiles.getItems(),
    };
  }
}
