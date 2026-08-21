import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { ApproveCareerRequestService } from './approve-career-request.service';
import { ApproveCareerRequestDto } from './approve-career-request.dto';

@ApiAuth()
@Controller('career-requests')
export class ApproveCareerRequestController {
  constructor(private readonly approveCareerRequestService: ApproveCareerRequestService) {}

  @ApiEndpoint({
    summary: 'Aprobar una solicitud de carrera adicional',
    description: 'Crea el StudentProfile de esa carrera para el usuario que la pidió.',
    secured: true,
    params: [{ name: 'id', description: 'ID de la solicitud', required: true }],
    body: { type: ApproveCareerRequestDto },
    validateBody: true,
    responses: [
      { status: 200, description: 'Solicitud aprobada' },
      { status: 400, description: 'La solicitud ya fue revisada' },
      { status: 404, description: 'Solicitud no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveCareerRequestDto,
    @Request() req,
  ) {
    return this.approveCareerRequestService.execute(+id, dto, req.user.userId);
  }
}
