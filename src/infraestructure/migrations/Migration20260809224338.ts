import { Migration } from '@mikro-orm/migrations';

export class Migration20260809224338 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "career_request" ("id" serial primary key, "user_id" int not null, "university_id" int not null, "career_id" int not null, "message" text null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "created_at" timestamptz not null, "reviewed_at" timestamptz null);`);

    this.addSql(`alter table "career_request" add constraint "career_request_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "career_request" add constraint "career_request_university_id_foreign" foreign key ("university_id") references "university" ("id") on update cascade;`);
    this.addSql(`alter table "career_request" add constraint "career_request_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "career_request" cascade;`);
  }

}
