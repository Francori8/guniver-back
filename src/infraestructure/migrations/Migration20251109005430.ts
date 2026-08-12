import { Migration } from '@mikro-orm/migrations';

export class Migration20251109005430 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "role" ("id" serial primary key, "name" varchar(255) not null, "description" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "role" add constraint "role_name_unique" unique ("name");`);

    this.addSql(`create table "subject" ("id" serial primary key, "name" varchar(255) not null, "description" text null, "code" varchar(255) null, "credits" int not null default 0, "hours_per_week" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "university" ("id" serial primary key, "name" varchar(255) not null, "acronym" varchar(255) not null, "address" varchar(255) null, "website" varchar(255) null, "phone" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "career" ("id" serial primary key, "name" varchar(255) not null, "description" varchar(255) null, "university_id" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "career_subjects" ("career_id" int not null, "subject_id" int not null, constraint "career_subjects_pkey" primary key ("career_id", "subject_id"));`);

    this.addSql(`create table "user" ("id" serial primary key, "email" varchar(255) not null, "password" varchar(255) not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "role_id" int not null, "avatar" varchar(255) null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "study_material" ("id" serial primary key, "title" varchar(255) not null, "description" text null, "subject_id" int not null, "type" text check ("type" in ('TEORICO', 'PRACTICO', 'VIDEO', 'EXAMENES', 'RESUMENES', 'BIBLIOGRAFIA', 'other')) not null, "resource_url" varchar(255) not null, "view_count" int not null default 0, "download_count" int not null default 0, "uploaded_by_id" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "student_profile" ("id" serial primary key, "user_id" int not null, "university_id" int not null, "type" text check ("type" in ('student', 'admin')) not null, "created_at" timestamptz not null, "is_active" boolean not null default true, "career_id" int not null, "enrollment_date" timestamptz not null);`);

    this.addSql(`create table "admin_profile" ("id" serial primary key, "user_id" int not null, "university_id" int not null, "type" text check ("type" in ('student', 'admin')) not null, "created_at" timestamptz not null, "is_active" boolean not null default true, "permission_level" varchar(255) not null default 'FULL');`);

    this.addSql(`alter table "career" add constraint "career_university_id_foreign" foreign key ("university_id") references "university" ("id") on update cascade;`);

    this.addSql(`alter table "career_subjects" add constraint "career_subjects_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "career_subjects" add constraint "career_subjects_subject_id_foreign" foreign key ("subject_id") references "subject" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user" add constraint "user_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade;`);

    this.addSql(`alter table "study_material" add constraint "study_material_subject_id_foreign" foreign key ("subject_id") references "subject" ("id") on update cascade;`);
    this.addSql(`alter table "study_material" add constraint "study_material_uploaded_by_id_foreign" foreign key ("uploaded_by_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "student_profile" add constraint "student_profile_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "student_profile" add constraint "student_profile_university_id_foreign" foreign key ("university_id") references "university" ("id") on update cascade;`);
    this.addSql(`alter table "student_profile" add constraint "student_profile_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade;`);

    this.addSql(`alter table "admin_profile" add constraint "admin_profile_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "admin_profile" add constraint "admin_profile_university_id_foreign" foreign key ("university_id") references "university" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop constraint "user_role_id_foreign";`);

    this.addSql(`alter table "career_subjects" drop constraint "career_subjects_subject_id_foreign";`);

    this.addSql(`alter table "study_material" drop constraint "study_material_subject_id_foreign";`);

    this.addSql(`alter table "career" drop constraint "career_university_id_foreign";`);

    this.addSql(`alter table "student_profile" drop constraint "student_profile_university_id_foreign";`);

    this.addSql(`alter table "admin_profile" drop constraint "admin_profile_university_id_foreign";`);

    this.addSql(`alter table "career_subjects" drop constraint "career_subjects_career_id_foreign";`);

    this.addSql(`alter table "student_profile" drop constraint "student_profile_career_id_foreign";`);

    this.addSql(`alter table "study_material" drop constraint "study_material_uploaded_by_id_foreign";`);

    this.addSql(`alter table "student_profile" drop constraint "student_profile_user_id_foreign";`);

    this.addSql(`alter table "admin_profile" drop constraint "admin_profile_user_id_foreign";`);

    this.addSql(`drop table if exists "role" cascade;`);

    this.addSql(`drop table if exists "subject" cascade;`);

    this.addSql(`drop table if exists "university" cascade;`);

    this.addSql(`drop table if exists "career" cascade;`);

    this.addSql(`drop table if exists "career_subjects" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "study_material" cascade;`);

    this.addSql(`drop table if exists "student_profile" cascade;`);

    this.addSql(`drop table if exists "admin_profile" cascade;`);
  }

}
