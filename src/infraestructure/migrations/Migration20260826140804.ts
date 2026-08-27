import { Migration } from '@mikro-orm/migrations';

export class Migration20260826140804 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "subject_progress" drop constraint if exists "subject_progress_status_check";`);

    this.addSql(`alter table "subject_progress" add constraint "subject_progress_status_check" check("status" in ('sin_cursar', 'cursada', 'pendiente_aprobacion', 'aprobada', 'desaprobada'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "subject_progress" drop constraint if exists "subject_progress_status_check";`);

    this.addSql(`alter table "subject_progress" add constraint "subject_progress_status_check" check("status" in ('sin_cursar', 'cursada', 'pendiente_aprobacion', 'aprobada'));`);
  }

}
