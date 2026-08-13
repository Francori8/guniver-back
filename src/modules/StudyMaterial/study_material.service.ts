import { Injectable, NotFoundException } from '@nestjs/common';
import { StudyMaterialRepository } from './study_material.repository';
import { SubjectRepository } from '../Subject/subject.repository';
import { UserRepository } from '../User/user.repository';
import { CloudinaryService } from '../Uploads/cloudinary.service';
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
    private readonly cloudinaryService: CloudinaryService,
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
      cloudinaryPublicId: m.cloudinaryPublicId,
      cloudinaryResourceType: m.cloudinaryResourceType,
      deletedAt: m.deletedAt,
      order: m.order,
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
    uploadedById: number,
  ): Promise<StudyMaterialResponseDto> {
    const subject = await this.subjectRepository.findOne(createDto.subjectId);
    if (!subject)
      throw new NotFoundException(`Subject ${createDto.subjectId} not found`);

    const user = await this.userRepository.findOne(uploadedById);
    if (!user)
      throw new NotFoundException(`User ${uploadedById} not found`);

    const material = this.studyMaterialRepository.create({
      title: createDto.title,
      description: createDto.description,
      subject,
      type: createDto.type as MaterialType,
      resourceUrl: createDto.resourceUrl,
      cloudinaryPublicId: createDto.cloudinaryPublicId,
      cloudinaryResourceType: createDto.cloudinaryResourceType,
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

    const list = await this.studyMaterialRepository.find(
      { deletedAt: null },
      { populate: ['subject', 'uploadedBy'], orderBy: { type: 'ASC', order: 'ASC' } },
    );
    return list.map((m) => this.toResponseDto(m));
  }

  async findTrash(): Promise<StudyMaterialResponseDto[]> {
    const list = await this.studyMaterialRepository.findTrash();
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

    const replacingFile =
      updates.cloudinaryPublicId &&
      updates.cloudinaryPublicId !== m.cloudinaryPublicId;
    const oldPublicId = m.cloudinaryPublicId;
    const oldResourceType = m.cloudinaryResourceType;

    const { subjectId, ...rest } = updates;
    this.studyMaterialRepository.assign(m, rest as any, { ignoreUndefined: true });
    await this.studyMaterialRepository.save(m);

    if (replacingFile && oldPublicId && oldResourceType) {
      await this.cloudinaryService.destroy(oldPublicId, oldResourceType);
    }

    return this.toResponseDto(m);
  }

  async reorder(items: { id: number; order: number }[]): Promise<void> {
    for (const item of items) {
      const m = await this.studyMaterialRepository.findOne(item.id);
      if (!m) continue;
      m.order = item.order;
    }
    await this.studyMaterialRepository.em.flush();
  }

  async registerView(id: number): Promise<void> {
    const m = await this.studyMaterialRepository.findOne(id);
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    m.viewCount += 1;
    await this.studyMaterialRepository.save(m);
  }

  async registerDownload(id: number): Promise<void> {
    const m = await this.studyMaterialRepository.findOne(id);
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    m.downloadCount += 1;
    await this.studyMaterialRepository.save(m);
  }

  async delete(id: number): Promise<void> {
    const m = await this.studyMaterialRepository.findOne(id);
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    m.deletedAt = new Date();
    await this.studyMaterialRepository.save(m);
  }

  async restore(id: number): Promise<StudyMaterialResponseDto> {
    const m = await this.studyMaterialRepository.findOne(id, {
      populate: ['subject', 'uploadedBy'],
    });
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);
    m.deletedAt = undefined;
    await this.studyMaterialRepository.save(m);
    return this.toResponseDto(m);
  }

  async permanentDelete(id: number): Promise<void> {
    const m = await this.studyMaterialRepository.findOne(id);
    if (!m)
      throw new NotFoundException(`StudyMaterial with ID ${id} not found`);

    if (m.cloudinaryPublicId && m.cloudinaryResourceType) {
      await this.cloudinaryService.destroy(m.cloudinaryPublicId, m.cloudinaryResourceType);
    }

    await this.studyMaterialRepository.removeAndFlush(m);
  }
}
