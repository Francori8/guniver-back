// mikro-orm.config.ts
import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

const mikroOrmConfig: Options = {
  driver: PostgreSqlDriver,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  dbName: process.env.DB_NAME || 'guniversity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',

  // ✅ AMBAS opciones son necesarias
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],

  migrations: {
    path: './dist/infraestructure/migrations',
    pathTs: './src/infraestructure/migrations',
  },
  debug: process.env.DB_DEBUG === 'true',
  extensions: [Migrator],
};

export default mikroOrmConfig;
