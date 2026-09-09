import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduledSubjectRepository } from './scheduled_subject.repository';
import { TermRepository } from '../Term/term.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { ScheduledSubject } from './scheduled_subject.entity';
import { ScheduleSlot } from './schedule_slot.entity';
import {
  ScheduledSubjectResponseDto,
  ScheduleSlotResponseDto,
} from './dto/scheduled_subject.response.dto';
import { CreateScheduledSubjectDto } from './dto/create_scheduled_subject.dto';
import { UpdateScheduledSubjectDto } from './dto/update_scheduled_subject.dto';
import { ScheduleSlotDto } from './dto/schedule_slot.dto';

@Injectable()
export class ScheduledSubjectService {
  constructor(
    private readonly scheduledSubjectRepository: ScheduledSubjectRepository,
    private readonly termRepository: TermRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
  ) {}

  toResponseDto(s: ScheduledSubject): ScheduledSubjectResponseDto {
    return new ScheduledSubjectResponseDto({
      id: s.id,
      termId: s.term.id,
      careerSubjectId: s.careerSubject.id,
      subjectName: s.careerSubject.subject.name,
      status: s.status,
      slots: s.slots
        .getItems()
        .map(
          (slot) =>
            new ScheduleSlotResponseDto({
              id: slot.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              location: slot.location,
              isException: slot.isException,
            }),
        ),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }

  private async getOwnedTermOrFail(termId: number, userId: number) {
    const term = await this.termRepository.findByIdWithRelations(termId);
    if (!term) {
      throw new NotFoundException(`Term with ID ${termId} not found`);
    }
    if (term.studentProfile.user.id !== userId) {
      throw new ForbiddenException('Este cuatrimestre no te pertenece');
    }
    return term;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private slotsOverlap(a: ScheduleSlotDto, b: ScheduleSlotDto): boolean {
    if (a.dayOfWeek !== b.dayOfWeek) return false;
    const aStart = this.timeToMinutes(a.startTime);
    const aEnd = this.timeToMinutes(a.endTime);
    const bStart = this.timeToMinutes(b.startTime);
    const bEnd = this.timeToMinutes(b.endTime);
    return aStart < bEnd && bStart < aEnd;
  }

  /**
   * Rechaza slots nuevos que se solapen con otro ScheduledSubject del mismo
   * Term, salvo que el slot nuevo venga marcado isException. `excludeId`
   * evita comparar contra sí mismo en un update.
   */
  private async assertNoOverlap(
    termId: number,
    slots: ScheduleSlotDto[],
    excludeId?: number,
  ) {
    const others = await this.scheduledSubjectRepository.findByTerm(termId);
    for (const other of others) {
      if (excludeId && other.id === excludeId) continue;
      for (const existingSlot of other.slots.getItems()) {
        if (existingSlot.isException) continue;
        for (const newSlot of slots) {
          if (newSlot.isException) continue;
          if (
            this.slotsOverlap(newSlot, {
              dayOfWeek: existingSlot.dayOfWeek,
              startTime: existingSlot.startTime,
              endTime: existingSlot.endTime,
            } as ScheduleSlotDto)
          ) {
            throw new BadRequestException(
              `El horario se superpone con ${other.careerSubject.subject.name}. Marcá isException si querés guardarlo igual.`,
            );
          }
        }
      }
    }
  }

  async findByTerm(
    termId: number,
    userId: number,
  ): Promise<ScheduledSubjectResponseDto[]> {
    await this.getOwnedTermOrFail(termId, userId);
    const entries = await this.scheduledSubjectRepository.findByTerm(termId);
    return entries.map((e) => this.toResponseDto(e));
  }

  /**
   * Combina los horarios de varios Term propios en una sola lista (ej. distintas
   * carreras cursadas en paralelo el mismo year/period) para pintarlos en una
   * única grilla semanal. Rechaza si alguno de los termIds no pertenece al usuario.
   */
  async findByTerms(
    termIds: number[],
    userId: number,
  ): Promise<ScheduledSubjectResponseDto[]> {
    for (const termId of termIds) {
      await this.getOwnedTermOrFail(termId, userId);
    }
    const entries = await this.scheduledSubjectRepository.findByTerms(termIds);
    return entries.map((e) => this.toResponseDto(e));
  }

  async create(
    termId: number,
    userId: number,
    dto: CreateScheduledSubjectDto,
  ): Promise<ScheduledSubjectResponseDto> {
    const term = await this.getOwnedTermOrFail(termId, userId);

    const careerSubject = await this.careerSubjectRepository.findOne(
      dto.careerSubjectId,
    );
    if (!careerSubject) {
      throw new NotFoundException(
        `CareerSubject with ID ${dto.careerSubjectId} not found`,
      );
    }
    if (careerSubject.career.id !== term.studentProfile.career.id) {
      throw new BadRequestException(
        'Esa materia no pertenece a la carrera de este cuatrimestre',
      );
    }

    const existing = await this.scheduledSubjectRepository.findByTermAndCareerSubject(
      termId,
      dto.careerSubjectId,
    );
    if (existing) {
      throw new BadRequestException(
        'Ya cargaste el horario de esta materia en este cuatrimestre',
      );
    }

    await this.assertNoOverlap(termId, dto.slots);

    const scheduledSubject = this.scheduledSubjectRepository.create({
      term,
      careerSubject,
      status: dto.status,
    } as any);

    for (const slotDto of dto.slots) {
      const slot = new ScheduleSlot();
      slot.scheduledSubject = scheduledSubject;
      slot.dayOfWeek = slotDto.dayOfWeek;
      slot.startTime = slotDto.startTime;
      slot.endTime = slotDto.endTime;
      slot.location = slotDto.location;
      slot.isException = slotDto.isException ?? false;
      scheduledSubject.slots.add(slot);
    }

    await this.scheduledSubjectRepository.save(scheduledSubject);

    const created = await this.scheduledSubjectRepository.findOne(scheduledSubject.id, {
      populate: ['term', 'careerSubject', 'careerSubject.subject', 'slots'],
    });
    return this.toResponseDto(created!);
  }

  async update(
    termId: number,
    id: number,
    userId: number,
    updates: UpdateScheduledSubjectDto,
  ): Promise<ScheduledSubjectResponseDto> {
    await this.getOwnedTermOrFail(termId, userId);

    const scheduledSubject = await this.scheduledSubjectRepository.findOne(
      { id, term: termId },
      { populate: ['term', 'careerSubject', 'careerSubject.subject', 'slots'] },
    );
    if (!scheduledSubject) {
      throw new NotFoundException(`ScheduledSubject with ID ${id} not found`);
    }

    if (updates.status !== undefined) {
      scheduledSubject.status = updates.status;
    }

    if (updates.slots !== undefined) {
      await this.assertNoOverlap(termId, updates.slots, id);

      scheduledSubject.slots.getItems().forEach((slot) => {
        scheduledSubject.slots.remove(slot);
      });
      for (const slotDto of updates.slots) {
        const slot = new ScheduleSlot();
        slot.scheduledSubject = scheduledSubject;
        slot.dayOfWeek = slotDto.dayOfWeek;
        slot.startTime = slotDto.startTime;
        slot.endTime = slotDto.endTime;
        slot.location = slotDto.location;
        slot.isException = slotDto.isException ?? false;
        scheduledSubject.slots.add(slot);
      }
    }

    await this.scheduledSubjectRepository.save(scheduledSubject);

    return this.toResponseDto(scheduledSubject);
  }

  async delete(termId: number, id: number, userId: number): Promise<void> {
    await this.getOwnedTermOrFail(termId, userId);

    const scheduledSubject = await this.scheduledSubjectRepository.findOne(
      { id, term: termId },
      { populate: ['slots'] },
    );
    if (!scheduledSubject) {
      throw new NotFoundException(`ScheduledSubject with ID ${id} not found`);
    }

    await this.scheduledSubjectRepository.removeAndFlush(scheduledSubject);
  }
}
