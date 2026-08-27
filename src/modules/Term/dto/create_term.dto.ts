import { TermPeriod } from '../term.entity';

export class CreateTermDto {
  careerId: number;
  year: number;
  period: TermPeriod;
  label?: string;
}
