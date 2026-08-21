// src/user/user.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { User } from 'src/modules/User/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(em: EntityManager) {
    super(em, User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email }, { populate: ['role'] });
  }
  async findByIdWithProfiles(id: number): Promise<User | null> {
    return this.findOne(
      { id },
      {
        populate: [
          'role',
          'studentProfiles',
          'adminProfiles',
          'studentProfiles.university',
          'studentProfiles.career',
          'adminProfiles.university',
        ],
      },
    );
  }

  async findAllUsers(): Promise<User[]> {
    return this.findAll({
      populate: [
        'role',
        'studentProfiles',
        'adminProfiles',
        'studentProfiles.university',
        'studentProfiles.career',
        'adminProfiles.university',
      ],
    });
  }

  async findUsersPaginated(page: number, limit: number) {
    return this.findPaginated({}, page, limit, {
      populate: [
        'role',
        'studentProfiles',
        'adminProfiles',
        'studentProfiles.university',
        'studentProfiles.career',
        'adminProfiles.university',
      ],
      orderBy: { id: 'ASC' },
    });
  }

  async findByIdWithRole(id: number): Promise<User | null> {
    return this.findOne({ id }, { populate: ['role'] });
  }

  async findByInviteToken(inviteToken: string): Promise<User | null> {
    return this.findOne({ inviteToken }, { populate: ['role'] });
  }
}
