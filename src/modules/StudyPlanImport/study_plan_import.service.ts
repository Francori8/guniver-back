import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerRepository } from '../Career/career.repository';
import { SubjectRepository } from '../Subject/subject.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { StudyPlanModuleRepository } from '../StudyPlanModule/study_plan_module.repository';
import { StudyPlanModuleType } from '../StudyPlanModule/study_plan_module.entity';
import {
  parseStudyPlanWorkbook,
  matchExistingSubject,
  matchExistingModule,
  MatchableSubject,
  MatchableModule,
} from './study_plan_import.parser';
import {
  PreviewStudyPlanResponseDto,
  PreviewPlanModuleSectionDto,
} from './dto/preview_study_plan.response.dto';
import { ConfirmStudyPlanImportDto } from './dto/confirm_study_plan_import.dto';
import { ConfirmStudyPlanImportResultDto } from './dto/confirm_study_plan_import_result.dto';

@Injectable()
export class StudyPlanImportService {
  constructor(
    private readonly careerRepository: CareerRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
  ) {}

  async buildPreview(
    careerId: number,
    buffer: Buffer,
  ): Promise<PreviewStudyPlanResponseDto> {
    const career = await this.careerRepository.findOne(careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${careerId} not found`);
    }

    const { sections, unparsedRows } = parseStudyPlanWorkbook(buffer);

    // Catálogo GLOBAL de Subjects (no sólo de esta carrera) para poder reusar una
    // materia compartida con otra carrera en vez de crear una duplicada.
    const allSubjects = await this.subjectRepository.findAll();
    const subjectCandidates: MatchableSubject[] = allSubjects.map((s) => ({
      subjectId: s.id,
      code: s.code,
      name: s.name,
    }));

    const existingCareerSubjects =
      await this.careerSubjectRepository.findByCareer(careerId);
    const subjectIdsAlreadyInCareer = new Set(
      existingCareerSubjects.map((cs) => cs.subject.id),
    );

    const existingModules =
      await this.studyPlanModuleRepository.findByCareer(careerId);
    const moduleCandidates: MatchableModule[] = existingModules.map((m) => ({
      moduleId: m.id,
      name: m.name,
    }));

    const previewSections: PreviewPlanModuleSectionDto[] = sections.map(
      (section) => {
        const moduleMatch = matchExistingModule(section.name, moduleCandidates);

        return {
          moduleName: section.name,
          moduleMatchMethod: moduleMatch.matchMethod,
          matchedModuleId: moduleMatch.moduleId,
          rows: section.rows.map((row) => {
            const subjectMatch = matchExistingSubject(
              row.code,
              row.subjectName,
              subjectCandidates,
            );
            return {
              code: row.code,
              subjectName: row.subjectName,
              credits: row.credits,
              subjectMatchMethod: subjectMatch.matchMethod,
              matchedSubjectId: subjectMatch.subjectId,
              matchedSubjectName: subjectCandidates.find(
                (c) => c.subjectId === subjectMatch.subjectId,
              )?.name,
              alreadyInCareer: subjectMatch.subjectId
                ? subjectIdsAlreadyInCareer.has(subjectMatch.subjectId)
                : false,
            };
          }),
        };
      },
    );

    return new PreviewStudyPlanResponseDto({
      careerId,
      sections: previewSections,
      unparsedRows,
    });
  }

  async confirmImport(
    dto: ConfirmStudyPlanImportDto,
    actorUserId: number,
  ): Promise<ConfirmStudyPlanImportResultDto> {
    const career = await this.careerRepository.findOne(dto.careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${dto.careerId} not found`);
    }

    let subjectsCreated = 0;
    let subjectsReused = 0;
    let modulesCreated = 0;
    let careerSubjectsCreated = 0;
    let careerSubjectsReassigned = 0;
    let careerSubjectsSkipped = 0;
    const errors: string[] = [];

    for (const section of dto.sections) {
      let moduleId = section.matchedModuleId;

      if (!moduleId) {
        try {
          const module = this.studyPlanModuleRepository.create({
            career,
            name: section.moduleName,
            order: 0,
            type: StudyPlanModuleType.OBLIGATORIO,
          } as any);
          await this.studyPlanModuleRepository.save(module);
          moduleId = module.id;
          modulesCreated++;
        } catch (err: any) {
          errors.push(
            `No se pudo crear el módulo "${section.moduleName}": ${err.message}`,
          );
          continue;
        }
      }

      for (const row of section.rows) {
        if (row.excluded) continue;

        try {
          let subject = row.matchedSubjectId
            ? await this.subjectRepository.findOne(row.matchedSubjectId)
            : null;

          if (!subject) {
            subject = this.subjectRepository.create({
              name: row.subjectName,
              code: row.code,
              credits: row.credits,
              hoursPerWeek: 0,
            } as any);
            await this.subjectRepository.save(subject);
            subjectsCreated++;
          } else {
            subjectsReused++;
          }

          const module = await this.studyPlanModuleRepository.findOne(moduleId);

          const existingLink =
            await this.careerSubjectRepository.findByCareerAndSubject(
              dto.careerId,
              subject.id,
            );
          if (existingLink) {
            // Ya está vinculada a esta carrera, posiblemente en un módulo "viejo"
            // (ej. de una carga manual o un import anterior con otro nombre de
            // módulo que no matcheó). Se reasigna al módulo del import actual en
            // vez de dejarla huérfana — así los módulos viejos quedan sin materias
            // y se pueden borrar sin tener que reasignar nada a mano.
            if (existingLink.module?.id !== module?.id) {
              existingLink.module = module ?? undefined;
              existingLink.credits = row.credits;
              await this.careerSubjectRepository.save(existingLink);
              careerSubjectsReassigned++;
            } else {
              careerSubjectsSkipped++;
            }
            continue;
          }

          const careerSubject = this.careerSubjectRepository.create({
            career,
            subject,
            module: module ?? undefined,
            credits: row.credits,
          } as any);
          await this.careerSubjectRepository.save(careerSubject);
          careerSubjectsCreated++;
        } catch (err: any) {
          errors.push(
            `No se pudo importar "${row.subjectName}" (${row.code}): ${err.message}`,
          );
        }
      }
    }

    return new ConfirmStudyPlanImportResultDto({
      subjectsCreated,
      subjectsReused,
      modulesCreated,
      careerSubjectsCreated,
      careerSubjectsReassigned,
      careerSubjectsSkipped,
      errors,
    });
  }
}
