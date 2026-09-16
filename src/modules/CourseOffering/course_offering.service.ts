import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { CourseOfferingRepository } from './course_offering.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { CareerRepository } from '../Career/career.repository';
import { CourseOffering } from './course_offering.entity';
import { CourseOfferingSlot } from './course_offering_slot.entity';
import { TermPeriod } from '../Term/term.entity';
import { parseCourseOfferingText, findBestFuzzyMatch } from './course_offering.parser';
import { matchExistingSubject, MatchableSubject } from '../StudyPlanImport/study_plan_import.parser';
import {
  PreviewCourseOfferingResponseDto,
  PreviewCommissionDto,
  PreviewSlotDto,
} from './dto/preview_course_offering.response.dto';
import { ConfirmCourseOfferingImportDto } from './dto/confirm_course_offering_import.dto';
import { ConfirmCourseOfferingImportResultDto } from './dto/confirm_course_offering_import_result.dto';
import {
  CourseOfferingResponseDto,
  CourseOfferingSlotResponseDto,
} from './dto/course_offering.response.dto';

@Injectable()
export class CourseOfferingService {
  constructor(
    private readonly courseOfferingRepository: CourseOfferingRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly careerRepository: CareerRepository,
  ) {}

  async buildPreview(
    careerId: number,
    buffer: Buffer,
  ): Promise<PreviewCourseOfferingResponseDto> {
    const career = await this.careerRepository.findOne(careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${careerId} not found`);
    }

    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const { commissions, unrecognizedLines } = parseCourseOfferingText(textResult.text);

    const careerSubjects = await this.careerSubjectRepository.findByCareer(careerId);
    const candidates: MatchableSubject[] = careerSubjects.map((cs) => ({
      subjectId: cs.id, // se matchea contra careerSubjectId directo, mismo patrón que RequirementImport
      name: cs.subject.name,
    }));

    const previewCommissions: PreviewCommissionDto[] = commissions.map((c) => {
      const match = matchExistingSubject('', c.subjectName, candidates);
      const matched = candidates.find((cand) => cand.subjectId === match.subjectId);

      if (match.matchMethod !== 'none') {
        return new PreviewCommissionDto({
          subjectName: c.subjectName,
          commission: c.commission,
          modality: c.modality,
          slots: c.slots.map(
            (s) =>
              new PreviewSlotDto({
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                isVirtual: s.isVirtual,
              }),
          ),
          unparsedScheduleText: c.unparsedScheduleText,
          matchedCareerSubjectId: match.subjectId,
          matchedSubjectName: matched?.name,
          matchMethod: 'name',
        });
      }

      // Sin match exacto: se sugiere el nombre más parecido del catálogo (ej.
      // "Bases de Datos" del PDF vs "Base de Datos" cargada) para que el admin
      // solo tenga que confirmar en vez de buscarla a mano en el selector — pero
      // nunca se aplica sin que quede visible como sugerencia editable.
      const fuzzy = findBestFuzzyMatch(
        c.subjectName,
        candidates.map((cand) => ({ id: cand.subjectId, name: cand.name })),
      );

      return new PreviewCommissionDto({
        subjectName: c.subjectName,
        commission: c.commission,
        modality: c.modality,
        slots: c.slots.map(
          (s) =>
            new PreviewSlotDto({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              isVirtual: s.isVirtual,
            }),
        ),
        unparsedScheduleText: c.unparsedScheduleText,
        matchedCareerSubjectId: fuzzy.id,
        matchedSubjectName: fuzzy.name,
        matchMethod: fuzzy.id ? 'fuzzy' : 'none',
      });
    });

    return new PreviewCourseOfferingResponseDto({
      careerId,
      commissions: previewCommissions,
      unrecognizedLines,
    });
  }

  async confirmImport(
    dto: ConfirmCourseOfferingImportDto,
  ): Promise<ConfirmCourseOfferingImportResultDto> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Reemplaza todo el catálogo existente de esta carrera/year/period antes de
    // insertar el nuevo — evita duplicados si se reimporta (ej. PDF "definitivo"
    // después del "tentativo"), a costa de que un ScheduledSubject de un
    // estudiante que ya eligió una comisión que cambió/desapareció en la nueva
    // versión no se actualiza solo (queda con el horario viejo que eligió).
    await this.courseOfferingRepository.deleteByCareer(dto.careerId, dto.year, dto.period);

    for (const commission of dto.commissions) {
      if (commission.excluded) {
        skipped++;
        continue;
      }

      const careerSubject = await this.careerSubjectRepository.findOne(
        commission.careerSubjectId,
      );
      if (!careerSubject) {
        errors.push(
          `CareerSubject ${commission.careerSubjectId} no encontrada (comisión ${commission.commission})`,
        );
        continue;
      }

      try {
        const offering = this.courseOfferingRepository.create({
          careerSubject,
          year: dto.year,
          period: dto.period,
          commission: commission.commission,
          modality: commission.modality,
        } as any);

        for (const slotDto of commission.slots) {
          const slot = new CourseOfferingSlot();
          slot.courseOffering = offering;
          slot.dayOfWeek = slotDto.dayOfWeek;
          slot.startTime = slotDto.startTime;
          slot.endTime = slotDto.endTime;
          slot.isVirtual = slotDto.isVirtual ?? false;
          offering.slots.add(slot);
        }

        await this.courseOfferingRepository.save(offering);
        created++;
      } catch (err: any) {
        errors.push(`No se pudo importar la comisión ${commission.commission}: ${err.message}`);
      }
    }

    return new ConfirmCourseOfferingImportResultDto({ created, skipped, errors });
  }

  async findByCareer(
    careerId: number,
    year: number,
    period: TermPeriod,
  ): Promise<CourseOfferingResponseDto[]> {
    const offerings = await this.courseOfferingRepository.findByCareer(careerId, year, period);
    return offerings.map(
      (o) =>
        new CourseOfferingResponseDto({
          id: o.id,
          careerSubjectId: o.careerSubject.id,
          subjectName: o.careerSubject.subject.name,
          year: o.year,
          period: o.period,
          commission: o.commission,
          modality: o.modality,
          slots: o.slots
            .getItems()
            .map(
              (s) =>
                new CourseOfferingSlotResponseDto({
                  dayOfWeek: s.dayOfWeek,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  isVirtual: s.isVirtual,
                }),
            ),
        }),
    );
  }
}
