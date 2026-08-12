import { Migration } from '@mikro-orm/migrations';

export class Migration20260801153306 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "access_request" ("id" serial primary key, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "email" varchar(255) not null, "message" text null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "created_at" timestamptz not null, "reviewed_at" timestamptz null);`);

    this.addSql(`alter table "user" add column "invite_token" varchar(255) null, add column "invite_token_expires_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "access_request" cascade;`);

    this.addSql(`alter table "user" drop column "invite_token", drop column "invite_token_expires_at";`);
  }

}
