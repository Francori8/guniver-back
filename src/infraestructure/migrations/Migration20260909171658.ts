import { Migration } from '@mikro-orm/migrations';

export class Migration20260909171658 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "course_offering" ("id" serial primary key, "career_subject_id" int not null, "year" int not null, "period" varchar(255) not null, "commission" varchar(255) not null, "modality" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "course_offering_slot" ("id" serial primary key, "course_offering_id" int not null, "day_of_week" smallint not null, "start_time" varchar(255) not null, "end_time" varchar(255) not null, "is_virtual" boolean not null default false);`);

    this.addSql(`alter table "course_offering" add constraint "course_offering_career_subject_id_foreign" foreign key ("career_subject_id") references "career_subject" ("id") on update cascade;`);

    this.addSql(`alter table "course_offering_slot" add constraint "course_offering_slot_course_offering_id_foreign" foreign key ("course_offering_id") references "course_offering" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "course_offering_slot" drop constraint "course_offering_slot_course_offering_id_foreign";`);

    this.addSql(`drop table if exists "course_offering" cascade;`);

    this.addSql(`drop table if exists "course_offering_slot" cascade;`);
  }

}
