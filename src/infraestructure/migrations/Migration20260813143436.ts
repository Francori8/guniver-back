import { Migration } from '@mikro-orm/migrations';

export class Migration20260813143436 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "study_material" add column "order" int not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "study_material" drop column "order";`);
  }

}
