import { Entity, Property } from '@mikro-orm/core';
import { Profile, ProfileType } from './profile.entity';

export enum PermissionLevel {
  FULL = 'FULL',
}

@Entity({
  tableName: 'admin_profile',
})
export class AdminProfile extends Profile {
  constructor() {
    super();
    this.type = ProfileType.ADMIN;
  }

  @Property({ default: PermissionLevel.FULL })
  permissionLevel: PermissionLevel = PermissionLevel.FULL;
}
