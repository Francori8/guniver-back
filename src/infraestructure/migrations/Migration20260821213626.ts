import { Migration } from '@mikro-orm/migrations';

export class Migration20260821213626 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "study_material" add column "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'approved', add column "is_official" boolean not null default true, add column "rejection_reason" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "study_material" drop column "status", drop column "is_official", drop column "rejection_reason";`);
  }

}
