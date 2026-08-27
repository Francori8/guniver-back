import { Migration } from '@mikro-orm/migrations';

export class Migration20260825193900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "term" ("id" serial primary key, "student_profile_id" int not null, "year" int not null, "period" text check ("period" in ('first', 'second')) not null, "label" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "term" add constraint "term_student_profile_id_year_period_unique" unique ("student_profile_id", "year", "period");`);

    this.addSql(`create table "subject_progress" ("id" serial primary key, "term_id" int not null, "career_subject_id" int not null, "status" text check ("status" in ('sin_cursar', 'cursada', 'pendiente_aprobacion', 'aprobada')) not null, "grade" int null, "is_exception" boolean not null default false, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "subject_progress" add constraint "subject_progress_term_id_career_subject_id_unique" unique ("term_id", "career_subject_id");`);

    this.addSql(`alter table "term" add constraint "term_student_profile_id_foreign" foreign key ("student_profile_id") references "student_profile" ("id") on update cascade;`);

    this.addSql(`alter table "subject_progress" add constraint "subject_progress_term_id_foreign" foreign key ("term_id") references "term" ("id") on update cascade;`);
    this.addSql(`alter table "subject_progress" add constraint "subject_progress_career_subject_id_foreign" foreign key ("career_subject_id") references "career_subject" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "subject_progress" drop constraint "subject_progress_term_id_foreign";`);

    this.addSql(`drop table if exists "term" cascade;`);

    this.addSql(`drop table if exists "subject_progress" cascade;`);
  }

}
