import { Controller, Get, Query } from '@nestjs/common';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { UniversityRepository } from '../University/university.repository';
import { CareerRepository } from '../Career/career.repository';

@Controller('public')
export class PublicController {
  constructor(
    private readonly universityRepository: UniversityRepository,
    private readonly careerRepository: CareerRepository,
  ) {}

  @ApiEndpoint({
    summary: 'Listar universidades (público)',
    description:
      'Endpoint público, solo id y nombre. Pensado para formularios públicos como la solicitud de acceso.',
    responses: [{ status: 200, description: 'Listado obtenido' }],
  })
  @Get('universities')
  async universities() {
    const universities = await this.universityRepository.findAllUniversities();
    return universities.map((u) => ({ id: u.id, name: u.name }));
  }

  @ApiEndpoint({
    summary: 'Listar carreras de una universidad (público)',
    description:
      'Endpoint público, solo id y nombre. Pensado para formularios públicos como la solicitud de acceso.',
    queries: [
      { name: 'universityId', description: 'ID de la universidad', required: true },
    ],
    responses: [{ status: 200, description: 'Listado obtenido' }],
  })
  @Get('careers')
  async careers(@Query('universityId') universityId: string) {
    if (!universityId) return [];
    const careers = await this.careerRepository.findByUniversity(+universityId);
    return careers.map((c) => ({ id: c.id, name: c.name }));
  }
}
