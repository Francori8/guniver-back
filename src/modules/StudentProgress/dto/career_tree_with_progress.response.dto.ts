import {
  CareerTreeModuleDto,
  RequirementRuleDto,
} from '../../CareerTree/dto/career_tree.response.dto';
import { SubjectProgressStatus } from '../../SubjectProgress/subject_progress.entity';

export class SubjectProgressStateDto {
  status: SubjectProgressStatus;
  isException?: boolean;
  enabledToCursar: boolean;
  enabledToAprobar: boolean;
}

export class CareerTreeSubjectWithProgressDto {
  id: number;
  subjectId: number;
  name: string;
  credits: number;
  module?: { id: number; name: string };
  requirements: {
    cursar: RequirementRuleDto[];
    aprobar: RequirementRuleDto[];
  };
  progress: SubjectProgressStateDto;
}

export class CareerTreeWithProgressResponseDto {
  career: { id: number; name: string };
  modules: CareerTreeModuleDto[];
  subjects: CareerTreeSubjectWithProgressDto[];

  constructor(partial: Partial<CareerTreeWithProgressResponseDto>) {
    Object.assign(this, partial);
  }
}
