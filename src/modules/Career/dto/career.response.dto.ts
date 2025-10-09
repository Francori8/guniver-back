export class CareerResponseDto {
  id: number;
  name: string;
  description?: string;
  duration?: number;
  university: {
    id: number;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CareerResponseDto>) {
    Object.assign(this, partial);
  }
}
