import { Controller, Get, Param, Request } from '@nestjs/common';
import { StudentProgressEvaluationService } from './student_progress_evaluation.service';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { CareerTreeWithProgressResponseDto } from './dto/career_tree_with_progress.response.dto';

// Convive con CareerController y CareerTreeController (ambos @Controller('careers')):
// esta ruta es GET :careerId/tree/my-progress (3 segmentos), sin ambigüedad de ruteo.
@ApiAuth()
@Controller('careers')
export class StudentProgressController {
  constructor(
    private readonly studentProgressEvaluationService: StudentProgressEvaluationService,
  ) {}

  @ApiEndpoint({
    summary: 'Árbol de correlativas con mi progreso',
    description:
      'Igual al árbol de correlativas, pero cada materia incluye mi estado y si está habilitada según lo que ya cursé/aprobé',
    secured: true,
    params: [
      { name: 'careerId', description: 'ID de la carrera', required: true },
    ],
    responses: [
      {
        status: 200,
        description: 'Árbol con progreso',
        type: CareerTreeWithProgressResponseDto,
      },
      { status: 404, description: 'No tenés perfil de estudiante en esa carrera' },
    ],
  })
  @Get(':careerId/tree/my-progress')
  async getTreeWithMyProgress(
    @Param('careerId') careerId: string,
    @Request() req,
  ): Promise<CareerTreeWithProgressResponseDto> {
    return this.studentProgressEvaluationService.getTreeWithProgress(
      +careerId,
      req.user.userId,
    );
  }
}
