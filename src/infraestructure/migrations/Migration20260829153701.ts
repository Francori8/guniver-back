import { Migration } from '@mikro-orm/migrations';

export class Migration20260829153701 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "scheduled_subject" ("id" serial primary key, "term_id" int not null, "career_subject_id" int not null, "status" text check ("status" in ('tentativo', 'confirmado')) not null default 'tentativo', "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "scheduled_subject" add constraint "scheduled_subject_term_id_career_subject_id_unique" unique ("term_id", "career_subject_id");`);

    this.addSql(`create table "schedule_slot" ("id" serial primary key, "scheduled_subject_id" int not null, "day_of_week" smallint not null, "start_time" varchar(255) not null, "end_time" varchar(255) not null, "location" varchar(255) null, "is_exception" boolean not null default false);`);

    this.addSql(`alter table "scheduled_subject" add constraint "scheduled_subject_term_id_foreign" foreign key ("term_id") references "term" ("id") on update cascade;`);
    this.addSql(`alter table "scheduled_subject" add constraint "scheduled_subject_career_subject_id_foreign" foreign key ("career_subject_id") references "career_subject" ("id") on update cascade;`);

    this.addSql(`alter table "schedule_slot" add constraint "schedule_slot_scheduled_subject_id_foreign" foreign key ("scheduled_subject_id") references "scheduled_subject" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "schedule_slot" drop constraint "schedule_slot_scheduled_subject_id_foreign";`);

    this.addSql(`drop table if exists "scheduled_subject" cascade;`);

    this.addSql(`drop table if exists "schedule_slot" cascade;`);
  }

}
