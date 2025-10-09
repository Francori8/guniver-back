// src/entities/Profile/admin-profile.entity.ts
import { Entity, Property } from '@mikro-orm/core';
import { Profile, ProfileType } from './profile.entity';
import { PermissionLevel } from 'src/shared/Types/permission_level';

@Entity()
export class AdminProfile extends Profile {
  constructor() {
    super();
    this.type = ProfileType.ADMIN;
  }
  @Property({ default: PermissionLevel.FULL })
  permissionLevel: PermissionLevel = PermissionLevel.FULL;
}
