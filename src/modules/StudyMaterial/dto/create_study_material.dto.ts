export class CreateStudyMaterialDto {
  title: string;
  description?: string;
  subjectId: number;
  type: string;
  resourceUrl: string;
  uploadedById: number;
}
