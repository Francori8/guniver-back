export class ConfirmCourseOfferingImportResultDto {
  created: number;
  skipped: number;
  errors: string[];

  constructor(partial: Partial<ConfirmCourseOfferingImportResultDto>) {
    Object.assign(this, partial);
  }
}
