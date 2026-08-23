import { StudyPlanModuleType } from '../study_plan_module.entity';

export class StudyPlanModuleResponseDto {
  id: number;
  name: string;
  order: number;
  type: StudyPlanModuleType;
  requiredCredits?: number;
  career: {
    id: number;
    name: string;
  };
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<StudyPlanModuleResponseDto>) {
    Object.assign(this, partial);
  }
}
