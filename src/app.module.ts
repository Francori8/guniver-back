// src/app.module.ts
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RoleModule } from './modules/Roles/role.module';
import { Options } from '@mikro-orm/core';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      // Configuración directa de MikroORM
      type: 'postgresql', // o 'mysql'
      dbName: 'tu_base_de_datos',
      password: 'tu_password',
      port: 5432,
      entities: ['./dist/entities'],
      entitiesTs: ['./src/entities'],
      autoLoadEntities: true,
      debug: true,
    } as Options), // ← Type assertion para evitar errores de tipo
    RoleModule,
  ],
})
export class AppModule {}
