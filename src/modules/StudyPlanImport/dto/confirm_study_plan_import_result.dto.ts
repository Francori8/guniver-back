export class ConfirmStudyPlanImportResultDto {
  subjectsCreated: number;
  subjectsReused: number;
  modulesCreated: number;
  careerSubjectsCreated: number;
  careerSubjectsReassigned: number;
  careerSubjectsSkipped: number;
  errors: string[];

  constructor(partial: Partial<ConfirmStudyPlanImportResultDto>) {
    Object.assign(this, partial);
  }
}
