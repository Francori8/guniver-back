import { Migration } from '@mikro-orm/migrations';

export class Migration20260809195840 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "access_request" add column "preferred_university_id" int null, add column "preferred_career_id" int null;`);
    this.addSql(`alter table "access_request" add constraint "access_request_preferred_university_id_foreign" foreign key ("preferred_university_id") references "university" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "access_request" add constraint "access_request_preferred_career_id_foreign" foreign key ("preferred_career_id") references "career" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "access_request" drop constraint "access_request_preferred_university_id_foreign";`);
    this.addSql(`alter table "access_request" drop constraint "access_request_preferred_career_id_foreign";`);

    this.addSql(`alter table "access_request" drop column "preferred_university_id", drop column "preferred_career_id";`);
  }

}
