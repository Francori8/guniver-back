export class ConfirmImportResultDto {
  created: number;
  skipped: number;
  errors: string[];

  constructor(partial: Partial<ConfirmImportResultDto>) {
    Object.assign(this, partial);
  }
}
