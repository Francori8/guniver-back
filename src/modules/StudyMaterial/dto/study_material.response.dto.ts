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
  order?: number;
  viewCount?: number;
  downloadCount?: number;
  uploadedBy?: { id: number; email?: string; firstName?: string; lastName?: string };
  status?: string;
  isOfficial?: boolean;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<StudyMaterialResponseDto>) {
    Object.assign(this, partial);
  }
}
