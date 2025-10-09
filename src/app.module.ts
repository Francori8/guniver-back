// src/app.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RoleModule } from './modules/Role/role.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/User/user.module';

import mikroOrmConfig from 'mikro-orm.config';
import { AuthModule } from './modules/Auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MikroOrmModule.forRoot({ ...mikroOrmConfig, autoLoadEntities: true }),
    RoleModule,
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
