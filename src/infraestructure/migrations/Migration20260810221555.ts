import { Migration } from '@mikro-orm/migrations';

export class Migration20260810221555 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "study_material" add column "cloudinary_public_id" varchar(255) null, add column "cloudinary_resource_type" varchar(255) null, add column "deleted_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "study_material" drop column "cloudinary_public_id", drop column "cloudinary_resource_type", drop column "deleted_at";`);
  }

}
