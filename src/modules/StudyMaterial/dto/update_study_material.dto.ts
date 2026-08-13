export class UpdateStudyMaterialDto {
  title?: string;
  description?: string;
  subjectId?: number;
  type?: string;
  resourceUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
  order?: number;
}
