import { Migration } from '@mikro-orm/migrations';

export class Migration20260821184629 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "audit_log" ("id" serial primary key, "actor_id" int not null, "action" text check ("action" in ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ROLE_CHANGE')) not null, "entity_type" text check ("entity_type" in ('User', 'University', 'Career', 'Subject', 'StudyMaterial', 'AccessRequest', 'CareerRequest')) not null, "entity_id" int not null, "metadata" jsonb null, "created_at" timestamptz not null);`);

    this.addSql(`alter table "audit_log" add constraint "audit_log_actor_id_foreign" foreign key ("actor_id") references "user" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);
  }

}
