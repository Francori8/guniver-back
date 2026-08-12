import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { RejectCareerRequestService } from './reject-career-request.service';

@ApiAuth()
@Controller('career-requests')
export class RejectCareerRequestController {
  constructor(private readonly rejectCareerRequestService: RejectCareerRequestService) {}

  @ApiEndpoint({
    summary: 'Rechazar una solicitud de carrera adicional',
    secured: true,
    params: [{ name: 'id', description: 'ID de la solicitud', required: true }],
    responses: [
      { status: 200, description: 'Solicitud rechazada' },
      { status: 400, description: 'La solicitud ya fue revisada' },
      { status: 404, description: 'Solicitud no encontrada' },
    ],
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/reject')
  async reject(@Param('id') id: string) {
    return this.rejectCareerRequestService.execute(+id);
  }
}
