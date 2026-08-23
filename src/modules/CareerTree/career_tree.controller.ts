import { Controller, Get, Param } from '@nestjs/common';
import { CareerTreeService } from './career_tree.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CareerTreeResponseDto } from './dto/career_tree.response.dto';

// Convive con CareerController (también @Controller('careers')): ese expone GET :id
// (1 segmento), este expone GET :careerId/tree (2 segmentos) — sin ambigüedad de ruteo.
@ApiAuth()
@Controller('careers')
export class CareerTreeController {
  constructor(private readonly careerTreeService: CareerTreeService) {}

  @ApiEndpoint({
    summary: 'Obtener el árbol de correlativas de una carrera',
    description:
      'Devuelve el catálogo completo de materias de una carrera con sus requisitos de cursada y aprobación resueltos (sin progreso de usuario)',
    secured: true,
    params: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
    ],
    responses: [
      {
        status: 200,
        description: 'Árbol de correlativas',
        type: CareerTreeResponseDto,
      },
      { status: 404, description: 'Carrera no encontrada' },
    ],
  })
  @Get(':careerId/tree')
  async getTree(
    @Param('careerId') careerId: string,
  ): Promise<CareerTreeResponseDto> {
    return this.careerTreeService.getTree(+careerId);
  }
}
