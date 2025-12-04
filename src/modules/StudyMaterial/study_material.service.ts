import { Injectable, NotFoundException } from '@nestjs/common';
import { StudyMaterialRepository } from './study_material.repository';
import { SubjectRepository } from '../Subject/subject.repository';
import { UserRepository } from '../User/user.repository';
import { StudyMaterial } from './study_material.entity';
import { StudyMaterialResponseDto } from './dto/study_material.response.dto';
import { CreateStudyMaterialDto } from './dto/create_study_material.dto';
import { UpdateStudyMaterialDto } from './dto/update_study_material.dto';
import { MaterialType } from './study_material.entity';

@Injectable()
export class StudyMaterialService {
  constructor(
    private readonly studyMaterialRepository: StudyMaterialRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly userRepository: UserRepository,
  ) {}

  toResponseDto(m: StudyMaterial): StudyMaterialResponseDto {
    return new StudyMaterialResponseDto({
      id: m.id,
      title: m.title,
      description: m.description,
      subject: m.subject
        ? { id: m.subject.id, name: (m.subject as any).name }
        : undefined,
      type: m.type,
      resourceUrl: m.resourceUrl,
      viewCount: m.viewCount,
      downloadCount: m.downloadCount,
      uploadedBy: m.uploadedBy
        ? { id: m.uploadedBy.id, email: (m.uploadedBy as any).email }
        : undefined,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    });
  }

  async create(
    createDto: CreateStudyMaterialDto,
  ): Promise<StudyMaterialResponseDto> {
    const subject = await this.subjectRepository.findOne(createDto.subjectId);
    if (!subject)
      throw new NotFoundException(`Subject ${createDto.subjectId} not found`);

    const user = await this.userRepository.findOne(createDto.uploadedById);
    if (!user)
      throw new NotFoundException(`User ${createDto.uploadedById} not found`);

    const material = this.studyMaterialRepository.create({
      title: createDto.title,
      description: createDto.description,
      subject,
      type: createDto.type as MaterialType,
      resourceUrl: createDto.resourceUrl,
      uploadedBy: user,
    } as any);

    await this.studyMaterialRepository.save(material);
    return this.toResponseDto(material);
  }

  async findAll(filters?: {
    subjectId?: number;
    type?: string;
    uploaderId?: number;
    popular?: boolean;
  }): Promise<StudyMaterialResponseDto[]> {
    if (filters?.subjectId && filters?.type) {
      const list = await this.studyMaterialRepository.findByTypeAndSubject(
        filters.subjectId,
        filters.type as MaterialType,
      );
      return list.map((m) => this.toResponseDto(m));
    }

    if (filters?.subjectId) {
      const list = await this.studyMaterialRepository.findBySubject(
        filters.subjectId,
      );
      return list.map((m) => this.toResponseDto(m));
    }

    if (filters?.uploaderId) {
      const list = await this.studyMaterialRepository.findByUploader(
        filters.uploaderId,
      );
      return list.map((m) => this.toResponseDto(m));
    }

    if (filters?.popular) {
      const list = await this.studyMaterialRepository.findPopular();
      return list.map((m) => this.toResponseDto(m));
    }

    const list = await this.studyMaterialRepository.findAll({
      populate: ['subject', 'uploadedBy'],
    });
    return list.map((m) => this.toResponseDto(m));
  }

  async findOne(id: number): Promise<StudyMaterialResponseDto> {
    const m = await this.studyMaterialRepository.findOne(id, {
      populate: ['subject', 'uploadedBy'],
    });
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    return this.toResponseDto(m);
  }

  async update(
    id: number,
    updates: UpdateStudyMaterialDto,
  ): Promise<StudyMaterialResponseDto> {
    const m = await this.studyMaterialRepository.findOne(id, {
      populate: ['subject', 'uploadedBy'],
    });
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);

    if (updates.subjectId) {
      const subject = await this.subjectRepository.findOne(updates.subjectId);
      if (!subject)
        throw new NotFoundException(`Subject ${updates.subjectId} not found`);
      m.subject = subject;
    }

    Object.assign(m, updates);
    await this.studyMaterialRepository.save(m);
    return this.toResponseDto(m);
  }

  async delete(id: number): Promise<void> {
    const m = await this.studyMaterialRepository.findOne(id);
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    await this.studyMaterialRepository.removeAndFlush(m);
  }
}
