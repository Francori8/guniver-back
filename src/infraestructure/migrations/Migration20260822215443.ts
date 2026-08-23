import { Migration } from '@mikro-orm/migrations';

export class Migration20260822215443 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "study_plan_module" ("id" serial primary key, "career_id" int not null, "name" varchar(255) not null, "order" int not null default 0, "type" text check ("type" in ('obligatorio', 'optativo_por_creditos')) not null default 'obligatorio', "required_credits" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "career_subject" ("id" serial primary key, "career_id" int not null, "subject_id" int not null, "module_id" int null, "credits" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "career_subject" add constraint "career_subject_career_id_subject_id_unique" unique ("career_id", "subject_id");`);

    this.addSql(`create table "requirement_group" ("id" serial primary key, "career_subject_id" int not null, "kind" text check ("kind" in ('cursar', 'aprobar')) not null, "option_number" int not null default 1, "created_at" timestamptz not null);`);

    this.addSql(`create table "requirement_item" ("id" serial primary key, "requirement_group_id" int not null, "type" text check ("type" in ('subject_approved', 'module_credits', 'module_complete')) not null, "target_career_subject_id" int null, "target_module_id" int null, "required_credits" int null);`);

    this.addSql(`alter table "study_plan_module" add constraint "study_plan_module_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade;`);

    this.addSql(`alter table "career_subject" add constraint "career_subject_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade;`);
    this.addSql(`alter table "career_subject" add constraint "career_subject_subject_id_foreign" foreign key ("subject_id") references "subject" ("id") on update cascade;`);
    this.addSql(`alter table "career_subject" add constraint "career_subject_module_id_foreign" foreign key ("module_id") references "study_plan_module" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "requirement_group" add constraint "requirement_group_career_subject_id_foreign" foreign key ("career_subject_id") references "career_subject" ("id") on update cascade;`);

    this.addSql(`alter table "requirement_item" add constraint "requirement_item_requirement_group_id_foreign" foreign key ("requirement_group_id") references "requirement_group" ("id") on update cascade;`);
    this.addSql(`alter table "requirement_item" add constraint "requirement_item_target_career_subject_id_foreign" foreign key ("target_career_subject_id") references "career_subject" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "requirement_item" add constraint "requirement_item_target_module_id_foreign" foreign key ("target_module_id") references "study_plan_module" ("id") on update cascade on delete set null;`);

    // Migra los pares existentes del M2M viejo career_subjects (career_id, subject_id)
    // a la nueva tabla career_subject, copiando el credits actual de subject como valor inicial per-carrera.
    this.addSql(`insert into "career_subject" ("career_id", "subject_id", "credits", "created_at", "updated_at")
      select cs."career_id", cs."subject_id", s."credits", now(), now()
      from "career_subjects" cs
      join "subject" s on s."id" = cs."subject_id";`);

    this.addSql(`drop table if exists "career_subjects" cascade;`);

    this.addSql(`alter table "audit_log" drop constraint if exists "audit_log_entity_type_check";`);

    this.addSql(`alter table "audit_log" add constraint "audit_log_entity_type_check" check("entity_type" in ('User', 'University', 'Career', 'Subject', 'StudyMaterial', 'AccessRequest', 'CareerRequest', 'StudyPlanModule', 'CareerSubject'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "career_subject" drop constraint "career_subject_module_id_foreign";`);

    this.addSql(`alter table "requirement_item" drop constraint "requirement_item_target_module_id_foreign";`);

    this.addSql(`alter table "requirement_group" drop constraint "requirement_group_career_subject_id_foreign";`);

    this.addSql(`alter table "requirement_item" drop constraint "requirement_item_target_career_subject_id_foreign";`);

    this.addSql(`alter table "requirement_item" drop constraint "requirement_item_requirement_group_id_foreign";`);

    this.addSql(`create table "career_subjects" ("career_id" int not null, "subject_id" int not null, constraint "career_subjects_pkey" primary key ("career_id", "subject_id"));`);

    this.addSql(`alter table "career_subjects" add constraint "career_subjects_career_id_foreign" foreign key ("career_id") references "career" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "career_subjects" add constraint "career_subjects_subject_id_foreign" foreign key ("subject_id") references "subject" ("id") on update cascade on delete cascade;`);

    // Restaura los pares desde career_subject antes de dropearla, para no perder datos al hacer rollback.
    this.addSql(`insert into "career_subjects" ("career_id", "subject_id")
      select "career_id", "subject_id" from "career_subject";`);

    this.addSql(`drop table if exists "study_plan_module" cascade;`);

    this.addSql(`drop table if exists "career_subject" cascade;`);

    this.addSql(`drop table if exists "requirement_group" cascade;`);

    this.addSql(`drop table if exists "requirement_item" cascade;`);

    this.addSql(`alter table "audit_log" drop constraint if exists "audit_log_entity_type_check";`);

    this.addSql(`alter table "audit_log" add constraint "audit_log_entity_type_check" check("entity_type" in ('User', 'University', 'Career', 'Subject', 'StudyMaterial', 'AccessRequest', 'CareerRequest'));`);
  }

}
