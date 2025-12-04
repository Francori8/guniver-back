export class SubjectResponseDto {
  id: number;
  name: string;
  description?: string;
  code?: string;
  credits?: number;
  hoursPerWeek?: number;
  careers?: { id: number; name: string }[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<SubjectResponseDto>) {
    Object.assign(this, partial);
  }
}
