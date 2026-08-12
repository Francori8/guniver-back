export class CreateSubjectDto {
  name: string;
  description?: string;
  code?: string;
  credits?: number;
  hoursPerWeek?: number;
  carrersIds: number[];
}
