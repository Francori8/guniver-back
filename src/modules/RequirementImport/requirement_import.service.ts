import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { StudyPlanModuleRepository } from '../StudyPlanModule/study_plan_module.repository';
import { RequirementService } from '../Requirement/requirement.service';
import { RequirementKind } from '../Requirement/requirement_group.entity';
import { RequirementItemType } from '../Requirement/requirement_item.entity';
import {
  matchExistingSubject,
  matchExistingModule,
  MatchableSubject,
  MatchableModule,
} from '../StudyPlanImport/study_plan_import.parser';
import {
  parseRequirementsHtml,
  interpretRequirementRow,
} from './requirement_import.parser';
import {
  PreviewRequirementImportResponseDto,
  PreviewRequirementSectionDto,
  PreviewRequirementItemDto,
} from './dto/preview_requirement_import.response.dto';
import { ConfirmRequirementImportDto } from './dto/confirm_requirement_import.dto';
import { ConfirmRequirementImportResultDto } from './dto/confirm_requirement_import_result.dto';

@Injectable()
export class RequirementImportService {
  constructor(
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
    private readonly requirementService: RequirementService,
  ) {}

  async buildPreview(
    careerSubjectId: number,
    html: string,
  ): Promise<PreviewRequirementImportResponseDto> {
    const careerSubject = await this.careerSubjectRepository.findOne(
      careerSubjectId,
      { populate: ['career'] },
    );
    if (!careerSubject) {
      throw new NotFoundException(
        `CareerSubject with ID ${careerSubjectId} not found`,
      );
    }

    const { sections } = parseRequirementsHtml(html);

    const careerSubjects = await this.careerSubjectRepository.findByCareer(
      careerSubject.career.id,
    );
    const subjectCandidates: MatchableSubject[] = careerSubjects.map((cs) => ({
      subjectId: cs.id, // se matchea contra careerSubjectId directo, no subjectId global
      code: cs.subject.code,
      name: cs.subject.name,
    }));

    const modules = await this.studyPlanModuleRepository.findByCareer(
      careerSubject.career.id,
    );
    const moduleCandidates: MatchableModule[] = modules.map((m) => ({
      moduleId: m.id,
      name: m.name,
    }));

    const previewSections: PreviewRequirementSectionDto[] = sections.map(
      (section) => {
        const items: PreviewRequirementItemDto[] = section.rows.map((row) => {
          const parsed = interpretRequirementRow(row);

          if (parsed.kind === 'subject_approved') {
            const match = matchExistingSubject(
              parsed.subjectCode ?? '',
              parsed.subjectName ?? '',
              subjectCandidates,
            );
            const matched = subjectCandidates.find(
              (c) => c.subjectId === match.subjectId,
            );
            return {
              kind: match.matchMethod === 'none' ? 'unrecognized' : 'subject_approved',
              rawCondicion: parsed.rawCondicion,
              subjectName: parsed.subjectName,
              subjectCode: parsed.subjectCode,
              matchedCareerSubjectId: match.subjectId,
              matchedSubjectName: matched?.name,
            };
          }

          if (parsed.kind === 'module_credits' || parsed.kind === 'module_complete') {
            const match = matchExistingModule(
              parsed.moduleName ?? '',
              moduleCandidates,
            );
            return {
              kind: match.matchMethod === 'none' ? 'unrecognized' : parsed.kind,
              rawCondicion: parsed.rawCondicion,
              moduleName: parsed.moduleName,
              matchedModuleId: match.moduleId,
              requiredCredits: parsed.requiredCredits,
            };
          }

          return {
            kind: 'unrecognized',
            rawCondicion: parsed.rawCondicion,
            subjectName: parsed.subjectName,
            moduleName: parsed.moduleName,
          };
        });

        return {
          kind: section.kind,
          items,
          extraOptionsIgnored: section.extraOptionsIgnored,
        };
      },
    );

    return new PreviewRequirementImportResponseDto({
      careerSubjectId,
      sections: previewSections,
    });
  }

  async confirmImport(
    dto: ConfirmRequirementImportDto,
    actorUserId: number,
  ): Promise<ConfirmRequirementImportResultDto> {
    let groupsSaved = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    for (const section of dto.sections) {
      const items = section.items.filter((item) => !item.excluded);
      if (items.length === 0) continue;

      const itemDtos = items
        .map((item) => {
          if (item.kind === 'subject_approved' && item.matchedCareerSubjectId) {
            return {
              type: RequirementItemType.SUBJECT_APPROVED,
              targetCareerSubjectId: item.matchedCareerSubjectId,
            };
          }
          if (item.kind === 'module_credits' && item.matchedModuleId) {
            return {
              type: RequirementItemType.MODULE_CREDITS,
              targetModuleId: item.matchedModuleId,
              requiredCredits: item.requiredCredits,
            };
          }
          if (item.kind === 'module_complete' && item.matchedModuleId) {
            return {
              type: RequirementItemType.MODULE_COMPLETE,
              targetModuleId: item.matchedModuleId,
            };
          }
          itemsSkipped++;
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (itemDtos.length === 0) continue;

      try {
        const kind =
          section.kind === 'cursar' ? RequirementKind.CURSAR : RequirementKind.APROBAR;
        await this.requirementService.save(
          dto.careerSubjectId,
          kind,
          { items: itemDtos },
          actorUserId,
        );
        groupsSaved++;
      } catch (err: any) {
        errors.push(`No se pudo guardar "${section.kind}": ${err.message}`);
      }
    }

    return new ConfirmRequirementImportResultDto({
      groupsSaved,
      itemsSkipped,
      errors,
    });
  }
}
