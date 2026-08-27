import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TermRepository } from './term.repository';
import { StudentProfileRepository } from '../Profile/repository/student_profile.repository';
import { Term } from './term.entity';
import { TermResponseDto } from './dto/term.response.dto';
import { CreateTermDto } from './dto/create_term.dto';
import { UpdateTermDto } from './dto/update_term.dto';

@Injectable()
export class TermService {
  constructor(
    private readonly termRepository: TermRepository,
    private readonly studentProfileRepository: StudentProfileRepository,
  ) {}

  toResponseDto(term: Term, subjectProgressCount?: number): TermResponseDto {
    return new TermResponseDto({
      id: term.id,
      year: term.year,
      period: term.period,
      label: term.label,
      career: {
        id: term.studentProfile.career.id,
        name: term.studentProfile.career.name,
      },
      subjectProgressCount,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    });
  }

  async create(userId: number, dto: CreateTermDto): Promise<TermResponseDto> {
    const studentProfile = await this.studentProfileRepository.findByUserAndCareer(
      userId,
      dto.careerId,
    );
    if (!studentProfile) {
      throw new NotFoundException(
        `No tenés un perfil de estudiante en la carrera ${dto.careerId}`,
      );
    }

    const existing = await this.termRepository.findOne({
      studentProfile: studentProfile.id,
      year: dto.year,
      period: dto.period,
    });
    if (existing) {
      throw new BadRequestException(
        `Ya tenés un cuatrimestre cargado para ${dto.year} - ${dto.period}`,
      );
    }

    const term = this.termRepository.create({
      studentProfile,
      year: dto.year,
      period: dto.period,
      label: dto.label,
    } as any);
    await this.termRepository.save(term);

    return this.toResponseDto(term);
  }

  async findByCareer(userId: number, careerId?: number): Promise<TermResponseDto[]> {
    const studentProfiles = careerId
      ? [await this.studentProfileRepository.findByUserAndCareer(userId, careerId)].filter(
          (p): p is NonNullable<typeof p> => p !== null,
        )
      : await this.studentProfileRepository.findByUserId(userId);

    const allTerms: Term[] = [];
    for (const profile of studentProfiles) {
      const terms = await this.termRepository.findByStudentProfile(profile.id);
      allTerms.push(...terms);
    }

    return allTerms.map((t) => this.toResponseDto(t));
  }

  private async findOwnedOrFail(id: number, userId: number): Promise<Term> {
    const term = await this.termRepository.findByIdWithRelations(id);
    if (!term) {
      throw new NotFoundException(`Term with ID ${id} not found`);
    }
    if (term.studentProfile.user.id !== userId) {
      throw new ForbiddenException('Este cuatrimestre no te pertenece');
    }
    return term;
  }

  async findOne(id: number, userId: number): Promise<TermResponseDto> {
    const term = await this.findOwnedOrFail(id, userId);
    return this.toResponseDto(term);
  }

  async getOwnedTerm(id: number, userId: number): Promise<Term> {
    return this.findOwnedOrFail(id, userId);
  }

  async update(
    id: number,
    userId: number,
    updates: UpdateTermDto,
  ): Promise<TermResponseDto> {
    const term = await this.findOwnedOrFail(id, userId);

    const nextYear = updates.year ?? term.year;
    const nextPeriod = updates.period ?? term.period;
    if (updates.year !== undefined || updates.period !== undefined) {
      const existing = await this.termRepository.findOne({
        studentProfile: term.studentProfile.id,
        year: nextYear,
        period: nextPeriod,
      });
      if (existing && existing.id !== term.id) {
        throw new BadRequestException(
          `Ya tenés un cuatrimestre cargado para ${nextYear} - ${nextPeriod}`,
        );
      }
    }

    this.termRepository.assign(term, updates, { ignoreUndefined: true });
    await this.termRepository.save(term);

    return this.toResponseDto(term);
  }

  async delete(id: number, userId: number): Promise<void> {
    const term = await this.findOwnedOrFail(id, userId);
    await this.termRepository.removeAndFlush(term);
  }
}
