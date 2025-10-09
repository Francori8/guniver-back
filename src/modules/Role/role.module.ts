// src/role/role.module.ts
import { Module } from '@nestjs/common';

import { RoleService } from './role.service';
import { RoleController } from './role.controller';

import { RoleRepository } from './role.repository';

@Module({
  imports: [],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
