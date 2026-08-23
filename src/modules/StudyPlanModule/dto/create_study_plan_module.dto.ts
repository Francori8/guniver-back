import { StudyPlanModuleType } from '../study_plan_module.entity';

export class CreateStudyPlanModuleDto {
  careerId: number;
  name: string;
  order?: number;
  type?: StudyPlanModuleType;
  requiredCredits?: number;
}
