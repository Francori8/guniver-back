import { TermPeriod } from '../term.entity';

export class TermResponseDto {
  id: number;
  year: number;
  period: TermPeriod;
  label?: string;
  career: { id: number; name: string };
  subjectProgressCount?: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<TermResponseDto>) {
    Object.assign(this, partial);
  }
}
