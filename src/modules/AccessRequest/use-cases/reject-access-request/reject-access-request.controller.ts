import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiAuth } from 'src/shared/Decorators/api_auth.decorator';
import { ApiEndpoint } from 'src/shared/Decorators/api_endpoitn_documentation';
import { RolesGuard } from 'src/shared/guards/role.guard';
import { Roles } from 'src/shared/Decorators/roles.decorator';
import { RoleName } from 'src/shared/Types/roles.enum';
import { RejectAccessRequestService } from './reject-access-request.service';

@ApiAuth()
@Controller('access-requests')
export class RejectAccessRequestController {
  constructor(private readonly rejectAccessRequestService: RejectAccessRequestService) {}

  @ApiEndpoint({
    summary: 'Rechazar una solicitud de acceso',
    description: 'Marca la solicitud como rechazada. No crea ninguna cuenta.',
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
    return this.rejectAccessRequestService.execute(+id);
  }
}
