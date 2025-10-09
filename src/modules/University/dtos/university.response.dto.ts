export class UniversityResponseDto {
  id: number;
  name: string;
  acronym: string;
  address?: string;
  website?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UniversityResponseDto>) {
    Object.assign(this, partial);
  }
}
