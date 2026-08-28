import { Migration } from '@mikro-orm/migrations';

export class Migration20260827200602 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "career_subject" add column "year" int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "career_subject" drop column "year";`);
  }

}
