import { TermPeriod } from '../term.entity';

export class UpdateTermDto {
  year?: number;
  period?: TermPeriod;
  label?: string;
}
