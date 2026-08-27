export class ConfirmRequirementImportResultDto {
  groupsSaved: number;
  itemsSkipped: number;
  errors: string[];

  constructor(partial: Partial<ConfirmRequirementImportResultDto>) {
    Object.assign(this, partial);
  }
}
