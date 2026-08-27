import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubjectProgressRepository } from './subject_progress.repository';
import { TermRepository } from '../Term/term.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { SubjectProgress } from './subject_progress.entity';
import { SubjectProgressResponseDto } from './dto/subject_progress.response.dto';
import { CreateSubjectProgressDto } from './dto/create_subject_progress.dto';
import { UpdateSubjectProgressDto } from './dto/update_subject_progress.dto';

@Injectable()
export class SubjectProgressService {
  constructor(
    private readonly subjectProgressRepository: SubjectProgressRepository,
    private readonly termRepository: TermRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
  ) {}

  toResponseDto(sp: SubjectProgress): SubjectProgressResponseDto {
    return new SubjectProgressResponseDto({
      id: sp.id,
      termId: sp.term.id,
      careerSubjectId: sp.careerSubject.id,
      subjectName: sp.careerSubject.subject.name,
      credits: sp.careerSubject.credits,
      status: sp.status,
      grade: sp.grade,
      isException: sp.isException,
      notes: sp.notes,
      createdAt: sp.createdAt,
      updatedAt: sp.updatedAt,
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

  async findByTerm(
    termId: number,
    userId: number,
  ): Promise<SubjectProgressResponseDto[]> {
    await this.getOwnedTermOrFail(termId, userId);
    const entries = await this.subjectProgressRepository.findByTerm(termId);
    return entries.map((e) => this.toResponseDto(e));
  }

  async create(
    termId: number,
    userId: number,
    dto: CreateSubjectProgressDto,
  ): Promise<SubjectProgressResponseDto> {
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

    const existing = await this.subjectProgressRepository.findByTermAndCareerSubject(
      termId,
      dto.careerSubjectId,
    );
    if (existing) {
      throw new BadRequestException(
        'Ya cargaste esta materia en este cuatrimestre',
      );
    }

    const subjectProgress = this.subjectProgressRepository.create({
      term,
      careerSubject,
      status: dto.status,
      grade: dto.grade,
      isException: dto.isException ?? false,
      notes: dto.notes,
    } as any);
    await this.subjectProgressRepository.save(subjectProgress);

    const created = await this.subjectProgressRepository.findOne(subjectProgress.id, {
      populate: ['term', 'careerSubject', 'careerSubject.subject'],
    });
    return this.toResponseDto(created!);
  }

  async update(
    termId: number,
    id: number,
    userId: number,
    updates: UpdateSubjectProgressDto,
  ): Promise<SubjectProgressResponseDto> {
    await this.getOwnedTermOrFail(termId, userId);

    const subjectProgress = await this.subjectProgressRepository.findOne(
      { id, term: termId },
      { populate: ['term', 'careerSubject', 'careerSubject.subject'] },
    );
    if (!subjectProgress) {
      throw new NotFoundException(`SubjectProgress with ID ${id} not found`);
    }

    this.subjectProgressRepository.assign(subjectProgress, updates, {
      ignoreUndefined: true,
    });
    await this.subjectProgressRepository.save(subjectProgress);

    return this.toResponseDto(subjectProgress);
  }

  async delete(termId: number, id: number, userId: number): Promise<void> {
    await this.getOwnedTermOrFail(termId, userId);

    const subjectProgress = await this.subjectProgressRepository.findOne({
      id,
      term: termId,
    });
    if (!subjectProgress) {
      throw new NotFoundException(`SubjectProgress with ID ${id} not found`);
    }

    await this.subjectProgressRepository.removeAndFlush(subjectProgress);
  }
}
