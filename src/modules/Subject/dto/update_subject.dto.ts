export class UpdateSubjectDto {
  name?: string;
  description?: string;
  code?: string;
  credits?: number;
  hoursPerWeek?: number;
  // Mismo nombre (con el typo) que CreateSubjectDto, para mantener la API consistente.
  carrersIds?: number[];
}
