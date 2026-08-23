import { StudyPlanModuleType } from '../study_plan_module.entity';

export class UpdateStudyPlanModuleDto {
  name?: string;
  order?: number;
  type?: StudyPlanModuleType;
  requiredCredits?: number;
}
