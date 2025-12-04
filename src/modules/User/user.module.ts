// src/role/role.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Role } from 'src/modules/Role/role.entity';
import { User } from 'src/modules/User/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { RoleModule } from '../Role/role.module';
import { ProfileModule } from '../Profile/profile.module';

@Module({
  imports: [RoleModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
