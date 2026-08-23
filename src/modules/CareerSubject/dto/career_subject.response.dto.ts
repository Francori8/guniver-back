export class CareerSubjectResponseDto {
  id: number;
  career: { id: number; name: string };
  subject: { id: number; name: string };
  module?: { id: number; name: string };
  credits: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<CareerSubjectResponseDto>) {
    Object.assign(this, partial);
  }
}
