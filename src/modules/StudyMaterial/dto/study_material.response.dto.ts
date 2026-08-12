export class StudyMaterialResponseDto {
  id: number;
  title: string;
  description?: string;
  subject?: { id: number; name: string };
  type?: string;
  resourceUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
  deletedAt?: Date;
  viewCount?: number;
  downloadCount?: number;
  uploadedBy?: { id: number; email?: string };
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<StudyMaterialResponseDto>) {
    Object.assign(this, partial);
  }
}
